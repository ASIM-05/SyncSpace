import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Stage, Layer, Line } from 'react-konva';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const socket = io('http://localhost:4000');

function App() {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('// Start typing — open a second tab to see it sync live');
  const isDrawing = useRef(false);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const isLocalChange = useRef(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('draw-history', (history) => {
      setLines(history);
    });
    socket.on('draw-line', (lineData) => {
      setLines((prev) => [...prev, lineData]);
    });

    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', 'syncspace-room', ydoc);
    const ytext = ydoc.getText('monaco');
    ydocRef.current = ydoc;
    ytextRef.current = ytext;

    if (ytext.toString() === '') {
      ytext.insert(0, code);
    } else {
      setCode(ytext.toString());
    }

    ytext.observe(() => {
      isLocalChange.current = true;
      setCode(ytext.toString());
    });

    return () => {
      socket.off('draw-line');
      socket.off('connect');
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  const handleEditorChange = (value) => {
    if (isLocalChange.current) {
      isLocalChange.current = false;
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
    setLines((prev) => [...prev, { points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const point = e.target.getStage().getPointerPosition();
    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      const updatedLine = { ...lastLine, points: [...lastLine.points, point.x, point.y] };
      return [...prev.slice(0, -1), updatedLine];
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const lastLine = lines[lines.length - 1];
    socket.emit('draw-line', lastLine);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>SyncSpace</h1>
        <div style={styles.status}>
          <span style={{ ...styles.dot, background: connected ? '#22c55e' : '#ef4444' }} />
          {connected ? 'Live Session Connected' : 'Connecting...'}
        </div>
      </div>
      <p style={styles.subtitle}>Whiteboard + Code Editor — both sync live across sessions</p>

      <div style={styles.splitView}>
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Whiteboard</h3>
          <Stage
            width={400}
            height={450}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            style={{ background: '#fff', borderRadius: '8px' }}
          >
            <Layer>
              {lines.map((line, i) => (
                <Line key={i} points={line.points} stroke="#111" strokeWidth={3} tension={0.5} lineCap="round" lineJoin="round" />
              ))}
            </Layer>
          </Stage>
        </div>

        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Code Editor</h3>
          <Editor
            height="450px"
            defaultLanguage="javascript"
            value={code}
            theme="vs-dark"
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', padding: '40px 30px' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '900px', margin: '0 auto' },
  title: { fontSize: '32px', margin: 0, fontWeight: 700 },
  status: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  subtitle: { maxWidth: '900px', margin: '10px auto 20px', color: '#94a3b8' },
  splitView: { display: 'flex', gap: '20px', maxWidth: '900px', margin: '0 auto', flexWrap: 'wrap' },
  panel: { flex: 1, minWidth: '400px' },
  panelTitle: { fontSize: '14px', color: '#94a3b8', marginBottom: '10px' },
};

export default App;