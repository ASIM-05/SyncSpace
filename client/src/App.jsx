import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Stage, Layer, Line } from 'react-konva';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import './App.css';

const socket = io('http://localhost:4000');

function App() {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState(
    '// Welcome to SyncSpace 🚀\n// Write code here and collaborate live.\n\nfunction helloTeam() {\n  return "Building together!";\n}'
  );

  const isDrawing = useRef(false);
  const linesRef = useRef([]);
  const ytextRef = useRef(null);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
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

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      'syncspace-room',
      ydoc
    );

    const ytext = ydoc.getText('monaco');
    ytextRef.current = ytext;

    if (ytext.toString() === '') {
      ytext.insert(0, code);
    } else {
      setCode(ytext.toString());
    }

    ytext.observe(() => {
      isRemoteChange.current = true;
      setCode(ytext.toString());
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('draw-history');
      socket.off('draw-line');
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  const updateLines = (updater) => {
    setLines((prev) => {
      const updated = updater(prev);
      linesRef.current = updated;
      return updated;
    });
  };

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

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    updateLines((prev) => [...prev, { points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const point = e.target.getStage().getPointerPosition();
    updateLines((prev) => {
      const last = prev[prev.length - 1];
      const updated = {
        ...last,
        points: [...last.points, point.x, point.y],
      };
      return [...prev.slice(0, -1), updated];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    socket.emit('draw-line', linesRef.current[linesRef.current.length - 1]);
  };

  const clearBoard = () => {
    setLines([]);
    linesRef.current = [];
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">⌘</div>
          <div>
            <h1>SyncSpace</h1>
            <p>Real-time collaborative workspace</p>
          </div>
        </div>

        <div className={`connection ${connected ? 'online' : ''}`}>
          <span />
          {connected ? 'Live session connected' : 'Connecting…'}
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">TEAM WORKSPACE</p>
          <h2>Build ideas together,<br />in real time.</h2>
          <p className="hero-copy">
            Sketch your thinking, write code, and collaborate with your team
            from one focused workspace.
          </p>
        </div>

        <div className="team-card">
          <div className="avatars">
            <span className="avatar purple">A</span>
            <span className="avatar blue">S</span>
            <span className="avatar green">+</span>
          </div>
          <div>
            <strong>Team Sync</strong>
            <p>Collaboration is active</p>
          </div>
        </div>
      </section>

      <section className="workspace">
        <div className="panel whiteboard-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">COLLABORATIVE CANVAS</p>
              <h3>Whiteboard</h3>
            </div>
            <button className="text-button" onClick={clearBoard}>
              Clear board
            </button>
          </div>

          <div className="canvas-wrap">
            <Stage
              width={520}
              height={430}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke="#35d5e7"
                    strokeWidth={3}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                  />
                ))}
              </Layer>
            </Stage>
            {!lines.length && (
              <div className="canvas-hint">
                <span>✦</span>
                Start drawing your ideas
              </div>
            )}
          </div>

          <div className="panel-footer">
            <span>✎ Draw freely on the canvas</span>
            <span className="sync-label">● Synced live</span>
          </div>
        </div>

        <div className="panel editor-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">SHARED DEVELOPMENT</p>
              <h3>Code editor</h3>
            </div>
            <span className="language-pill">JavaScript</span>
          </div>

          <div className="editor-wrap">
            <Editor
              height="430px"
              defaultLanguage="javascript"
              value={code}
              theme="vs-dark"
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 18 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          <div className="panel-footer">
            <span>⌘ S Auto-saved</span>
            <span className="sync-label">● Live editing</span>
          </div>
        </div>
      </section>

      <footer>
        <span>SyncSpace</span>
        <span>Made for better team collaboration</span>
      </footer>
    </main>
  );
}

export default App;