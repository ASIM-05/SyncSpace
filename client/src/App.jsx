import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Stage, Layer, Line, Rect, Circle, Arrow } from 'react-konva';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import './App.css';

const socket = io('http://localhost:4000');
const DEFAULT_CODE = `// Welcome to SyncSpace 🚀
// Write code here and collaborate live.

function helloTeam() {
  console.log("Welcome to SyncSpace!");
  return "Building together!";
}

helloTeam();`;

const makeRoomId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

function App() {
  // Navigation & Identity
  const [isJoined, setIsJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState(
    new URLSearchParams(window.location.search).get('room') || ''
  );
  const [copyLabel, setCopyLabel] = useState('Copy Room ID');
  const [connected, setConnected] = useState(false);

  // Whiteboard Canvas
  const [lines, setLines] = useState([]);
  const [currentTool, setCurrentTool] = useState('pen'); // 'pen', 'rectangle', 'circle', 'arrow', 'eraser'
  const [currentColor, setCurrentColor] = useState('#6366f1'); // Indigo accent
  const isDrawing = useRef(false);
  const linesRef = useRef([]);

  // Monaco Editor
  const [code, setCode] = useState(DEFAULT_CODE);
  const ytextRef = useRef(null);
  const isRemoteChange = useRef(false);

  // Console Output
  const [consoleOutput, setConsoleOutput] = useState('Run your JavaScript code to see the output here...');

  // Timer
  const [timer, setTimer] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  // Notes
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Connected Users
  const [usersList, setUsersList] = useState([]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Session Timer counter
  useEffect(() => {
    if (!isJoined || !timerRunning) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isJoined, timerRunning]);

  // Main Room Synchronization Connection
  useEffect(() => {
    if (!isJoined) return;

    // Sync room ID in browser bar search params
    const roomUrl = new URL(window.location.href);
    roomUrl.searchParams.set('room', roomId);
    window.history.replaceState({}, '', roomUrl);

    const joinRoom = () => {
      socket.emit('join-room', { roomId, username }, (res) => {
        if (res && res.ok) {
          setConnected(true);
        } else {
          setConnected(false);
          setIsJoined(false);
          alert(res?.error || 'Failed to join room.');
        }
      });
    };

    socket.on('connect', joinRoom);
    socket.on('disconnect', () => setConnected(false));

    socket.on('draw-history', (history) => {
      setLines(history);
      linesRef.current = history;
    });

    socket.on('draw-line', (lineData) => {
      setLines((prev) => {
        const updated = [...prev, lineData];
        linesRef.current = updated;
        return updated;
      });
    });

    socket.on('board-cleared', () => {
      setLines([]);
      linesRef.current = [];
    });

    socket.on('users-list', (users) => {
      setUsersList(users);
    });

    socket.on('notes-history', (notesList) => {
      setNotes(notesList);
    });

    socket.on('receive-message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    if (socket.connected) joinRoom();

    // Collaborative Yjs editor provider setup
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      `syncspace-${roomId}`,
      ydoc
    );

    const ytext = ydoc.getText('monaco');
    ytextRef.current = ytext;

    ytext.observe(() => {
      isRemoteChange.current = true;
      setCode(ytext.toString());
    });

    provider.on('sync', (isSynced) => {
      if (!isSynced) return;
      if (ytext.length === 0) {
        ytext.insert(0, DEFAULT_CODE);
      } else {
        setCode(ytext.toString());
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('draw-history');
      socket.off('draw-line');
      socket.off('board-cleared');
      socket.off('users-list');
      socket.off('notes-history');
      socket.off('receive-message');
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, isJoined]);

  // Editor Actions
  const handleEditorChange = (value = '') => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    const ytext = ytextRef.current;
    if (!ytext) return;

    ytext.doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.insert(0, value);
    });
  };

  const handleRunCode = () => {
    setConsoleOutput('Running code...\n');
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
    };
    try {
      // Evaluate Monaco Editor Value
      // eslint-disable-next-line no-eval
      eval(code);
      setConsoleOutput(logs.join('\n') || 'Code executed successfully (no stdout notes).');
    } catch (err) {
      setConsoleOutput(logs.join('\n') + `\nError: ${err.message}`);
    } finally {
      console.log = originalLog;
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard?.writeText(code);
    alert('Code copied to clipboard!');
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `syncspace-code-${roomId || 'session'}.js`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sticky Notes Actions
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;

    if (editingNoteId) {
      // Save Edits
      const updatedNote = { id: editingNoteId, title: noteTitle, content: noteContent };
      socket.emit('edit-note', updatedNote);
      setEditingNoteId(null);
    } else {
      // Create Note
      const newNote = {
        id: Date.now().toString(),
        title: noteTitle.trim(),
        content: noteContent.trim(),
        timestamp: new Date().toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
      socket.emit('add-note', newNote);
    }
    setNoteTitle('');
    setNoteContent('');
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const handleDeleteNote = (id) => {
    socket.emit('delete-note', id);
  };

  // Chat Actions
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      id: Date.now().toString(),
      username: username || 'Anonymous',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    socket.emit('send-message', msg);
    setChatMessages((prev) => [...prev, msg]);
    setChatInput('');
  };

  // Whiteboard Stage Canvas Handlers
  const updateLines = (updater) => {
    setLines((prev) => {
      const updated = updater(prev);
      linesRef.current = updated;
      return updated;
    });
  };

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const color = currentTool === 'eraser' ? '#0b121a' : currentColor;
    const width = currentTool === 'eraser' ? 18 : 3;

    updateLines((prev) => [
      ...prev,
      {
        points: [pos.x, pos.y, pos.x, pos.y],
        tool: currentTool,
        color,
        strokeWidth: width
      }
    ]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const pos = e.target.getStage().getPointerPosition();

    updateLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;

      let updatedPoints;
      if (last.tool === 'pen' || last.tool === 'eraser') {
        updatedPoints = [...last.points, pos.x, pos.y];
      } else {
        updatedPoints = [last.points[0], last.points[1], pos.x, pos.y];
      }

      const updated = {
        ...last,
        points: updatedPoints
      };
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const lastShape = linesRef.current[linesRef.current.length - 1];
    if (lastShape) {
      socket.emit('draw-line', lastShape);
    }
  };

  const handleClearBoard = () => {
    setLines([]);
    linesRef.current = [];
    socket.emit('clear-board');
  };

  // Join Room Actions
  const triggerJoinMode = (event, viewNotes = false) => {
    if (event) event.preventDefault();
    if (!username.trim()) {
      alert('Please enter your name first!');
      return;
    }
    const nextRoom = roomInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    if (nextRoom.length < 3 || nextRoom.length > 64) {
      alert('Please enter or generate a Room ID (3-64 characters).');
      return;
    }
    setRoomId(nextRoom);
    setIsJoined(true);

    if (viewNotes) {
      setTimeout(() => {
        const target = document.getElementById('notes-section-anchor');
        target?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  };

  const handleGenerateRoom = () => {
    setRoomInput(makeRoomId());
  };

  const handleCopyRoom = async () => {
    if (!roomInput) return;
    await navigator.clipboard?.writeText(roomInput);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy Room ID'), 1800);
  };

  const handleLeaveRoom = () => {
    setIsJoined(false);
    setConnected(false);
    setUsername('');
    setUsersList([]);
    setChatMessages([]);
  };

  // Timer formatter Helper
  const formatTime = (totalSeconds) => {
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  // Filter sticky notes on user input
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Landing State UI
  if (!isJoined) {
    return (
      <main className="landing-app">
        <div className="landing-container">
          <div className="landing-hero">
            <div className="landing-brand">
              <span className="rocket-icon">🚀</span>
              <h1>SyncSpace</h1>
              <p className="tagline">Real-Time Collaborative Workspace</p>
            </div>

            <div className="features-row">
              <div className="feature-card f-code">
                <div className="f-icon">&lt;/&gt;</div>
                <span className="f-title">Code Together</span>
              </div>
              <div className="feature-card f-chat">
                <div className="f-icon">💬</div>
                <span className="f-title">Chat Together</span>
              </div>
              <div className="feature-card f-notes">
                <div className="f-icon">📝</div>
                <span className="f-title">Notes Together</span>
              </div>
              <div className="feature-card f-draw">
                <div className="f-icon">🎨</div>
                <span className="f-title">Whiteboard Together</span>
              </div>
            </div>
          </div>

          <div className="join-card">
            <div className="join-header">
              <span className="header-icon">🚀</span>
              <h2>SyncSpace</h2>
              <p>Real-Time Collaborative Workspace</p>
            </div>

            <form onSubmit={(e) => triggerJoinMode(e, false)}>
              <div className="input-group">
                <label>Enter Your Name</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. VEDANSH MISRA"
                />
              </div>

              <div className="input-group">
                <label>Enter Room ID</label>
                <input
                  type="text"
                  required
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 8E723190"
                />
              </div>

              <div className="action-buttons">
                <button
                  type="button"
                  className="btn-purple"
                  onClick={handleGenerateRoom}
                >
                  🎭 Generate Room ID
                </button>

                <button
                  type="button"
                  className="btn-blue"
                  disabled={!roomInput}
                  onClick={handleCopyRoom}
                >
                  📋 {copyLabel}
                </button>

                <button type="submit" className="btn-green">
                  🚀 Join / Create Room
                </button>

                <button
                  type="button"
                  className="btn-white"
                  onClick={(e) => triggerJoinMode(e, true)}
                >
                  📝 Go to Notes
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // Render Workspace Dashboard State UI
  return (
    <main className="dashboard-app">
      {/* Top Navbar */}
      <header className="dashboard-navbar">
        <div className="nav-brand">
          <span className="rocket-icon">🚀</span>
          <h2>SyncSpace</h2>
        </div>

        <div className="nav-controls">
          <span className="pill-room">Room: {roomId}</span>
          <button className="btn-copy-nav" onClick={handleCopyRoom}>
            Copy
          </button>
          <button className="btn-about-nav" onClick={() => alert('SyncSpace v1.0.0 - Built for live code syncing and team canvases.')}>
            About
          </button>
          <span className={`pill-status ${connected ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot" />
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        <div className="nav-user">
          <div className="user-profile">
            <span className="user-avatar">{username ? username.charAt(0).toUpperCase() : 'U'}</span>
            <span className="user-name">{username}</span>
          </div>
          <button className="btn-leave" onClick={handleLeaveRoom}>
            Leave
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <section className="dashboard-grid">
        {/* Participants Sidebar Panel (Left) */}
        <article className="card panel-participants">
          <div className="card-header">
            <h3>👥 Participants</h3>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="lbl">Room</span>
              <strong className="room-val">{roomId}</strong>
            </div>

            <div className="timer-box">
              <span className="lbl">Meeting Time</span>
              <div className="timer-val">{formatTime(timer)}</div>
              <div className="timer-controls">
                <button
                  className="btn-timer-play"
                  onClick={() => setTimerRunning(!timerRunning)}
                >
                  {timerRunning ? 'Pause' : 'Resume'}
                </button>
                <button className="btn-timer-reset" onClick={() => setTimer(0)}>
                  Reset
                </button>
              </div>
            </div>

            <div className="users-list-wrapper">
              <span className="lbl">You</span>
              <div className="current-user-item">
                <span className="user-dot active" />
                {username} (You)
              </div>

              <span className="lbl section-lbl">Connected Users</span>
              <div className="users-scroll">
                {usersList
                  .filter((u) => u.id !== socket.id)
                  .map((user) => (
                    <div key={user.id} className="user-list-item">
                      <span className="user-dot active" />
                      {user.username}
                    </div>
                  ))}
                {usersList.length <= 1 && (
                  <p className="no-guests">No other users in this session.</p>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Action Panel containing: Code Editor, output logs and canvas (Center) */}
        <article className="card panel-editor">
          <div className="card-header border-b">
            <h3>💻 Collaborative Code Editor</h3>
            <div className="editor-controls">
              <span className="language-badge">JAVASCRIPT</span>
              <button className="btn-green-sm" onClick={handleRunCode}>
                ▶ Run Code
              </button>
              <button className="btn-blue-sm" onClick={handleCopyCode}>
                📄 Copy Code
              </button>
              <button className="btn-purple-sm" onClick={handleDownloadCode}>
                📥 Download Code
              </button>
            </div>
          </div>

          <div className="editor-container">
            <Editor
              height="260px"
              defaultLanguage="javascript"
              value={code}
              theme="vs-dark"
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                automaticLayout: true
              }}
            />
          </div>

          {/* Console Log Panel */}
          <div className="console-panel">
            <div className="console-header">
              <span>🖥️ Output</span>
              <button className="btn-clear-console" onClick={() => setConsoleOutput('')}>
                Clear
              </button>
            </div>
            <pre className="console-output">{consoleOutput}</pre>
          </div>
        </article>

        {/* Chat Sidebar Panel (Right) */}
        <article className="card panel-chat">
          <div className="card-header">
            <h3>💬 Room Chat</h3>
          </div>
          <div className="card-body chat-flex">
            <div className="messages-log">
              {chatMessages.length === 0 ? (
                <div className="chat-empty">No messages yet. Start values syncing!</div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-msg ${msg.username === username ? 'msg-own' : 'msg-other'}`}
                  >
                    <span className="msg-sender">{msg.username}</span>
                    <p className="msg-bubble">{msg.text}</p>
                    <span className="msg-time">{msg.timestamp}</span>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <form className="chat-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </article>
      </section>

      {/* Anchor for Go To Notes Navigation scroll */}
      <div id="notes-section-anchor" />

      {/* Grid Row 2: Shared Sticky Notes & Canvas Workspace */}
      <section className="dashboard-bottom-grid">
        {/* Searchable Sticky Notes panel */}
        <article className="card panel-notes-list">
          <div className="card-header border-b">
            <h3>📓 My Notes</h3>
            <input
              type="text"
              className="notes-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search your notes..."
            />
          </div>
          <div className="card-body notes-flex">
            {filteredNotes.length === 0 ? (
              <div className="notes-empty-state">No notes match your search.</div>
            ) : (
              <div className="notes-cards-list">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="sticky-note-item">
                    <div className="note-card-content">
                      <h4>{note.title}</h4>
                      <p>{note.content}</p>
                      <span className="note-time">{note.timestamp}</span>
                    </div>
                    <div className="note-card-actions">
                      <button className="note-btn-edit" onClick={() => handleEditNote(note)}>
                        ✏ Edit
                      </button>
                      <button className="note-btn-delete" onClick={() => handleDeleteNote(note.id)}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Edit/Add Sticky Note pane */}
        <article className="card panel-add-note">
          <div className="card-header">
            <h3>✏ {editingNoteId ? 'Edit Note' : 'Add Note'}</h3>
          </div>
          <form onSubmit={handleAddNote} className="card-body add-note-flex">
            <div className="input-group">
              <label>Enter Title</label>
              <input
                type="text"
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note title..."
              />
            </div>

            <div className="input-group">
              <label>Enter Content</label>
              <textarea
                required
                rows={5}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write note contents..."
              />
            </div>

            <div className="note-form-buttons">
              <button type="submit" className="btn-add-note">
                {editingNoteId ? 'Save Changes' : '➕ Add Note'}
              </button>
              {editingNoteId && (
                <button
                  type="button"
                  className="btn-cancel-note"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteTitle('');
                    setNoteContent('');
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </article>

        {/* Whiteboard canvas card */}
        <article className="card panel-whiteboard">
          <div className="card-header border-b">
            <h3>🎨 Whiteboard Canvas</h3>
            <div className="whiteboard-toolbar">
              <button
                className={`tool-btn ${currentTool === 'pen' ? 'active' : ''}`}
                onClick={() => setCurrentTool('pen')}
                title="Pencil Pen"
              >
                ✏ Pen
              </button>
              <button
                className={`tool-btn ${currentTool === 'rectangle' ? 'active' : ''}`}
                onClick={() => setCurrentTool('rectangle')}
                title="Rectangle shape"
              >
                ⬜ Rect
              </button>
              <button
                className={`tool-btn ${currentTool === 'circle' ? 'active' : ''}`}
                onClick={() => setCurrentTool('circle')}
                title="Circle shape"
              >
                ◯ Circle
              </button>
              <button
                className={`tool-btn ${currentTool === 'arrow' ? 'active' : ''}`}
                onClick={() => setCurrentTool('arrow')}
                title="Arrow pointer"
              >
                ➔ Arrow
              </button>
              <button
                className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
                onClick={() => setCurrentTool('eraser')}
                title="Canvas Eraser"
              >
                🧹 Eraser
              </button>
              <button className="tool-btn-clear" onClick={handleClearBoard} title="Clear board">
                🗑 Clear
              </button>

              <div className="color-selectors">
                {['#2eddec', '#f43f5e', '#10b981', '#fbbf24', '#ffffff'].map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${currentColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setCurrentColor(color);
                      if (currentTool === 'eraser') setCurrentTool('pen');
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="canvas-container">
            <Stage
              width={450}
              height={300}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {lines.map((line, i) => {
                  if (line.tool === 'rectangle') {
                    return (
                      <Rect
                        key={i}
                        x={line.points[0]}
                        y={line.points[1]}
                        width={line.points[2] - line.points[0]}
                        height={line.points[3] - line.points[1]}
                        stroke={line.color || '#35d5e7'}
                        strokeWidth={line.strokeWidth || 3}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  } else if (line.tool === 'circle') {
                    const r = Math.sqrt(
                      Math.pow(line.points[2] - line.points[0], 2) +
                      Math.pow(line.points[3] - line.points[1], 2)
                    );
                    return (
                      <Circle
                        key={i}
                        x={line.points[0]}
                        y={line.points[1]}
                        radius={r}
                        stroke={line.color || '#35d5e7'}
                        strokeWidth={line.strokeWidth || 3}
                      />
                    );
                  } else if (line.tool === 'arrow') {
                    return (
                      <Arrow
                        key={i}
                        points={line.points}
                        stroke={line.color || '#35d5e7'}
                        strokeWidth={line.strokeWidth || 3}
                        fill={line.color || '#35d5e7'}
                        pointerLength={10}
                        pointerWidth={10}
                      />
                    );
                  } else {
                    return (
                      <Line
                        key={i}
                        points={line.points}
                        stroke={line.color || '#35d5e7'}
                        strokeWidth={line.strokeWidth || 3}
                        tension={line.tool === 'pen' ? 0.5 : 0}
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  }
                })}
              </Layer>
            </Stage>
            {lines.length === 0 && (
              <div className="canvas-hint">
                <span>✦</span>
                Start drawing on canvas
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
