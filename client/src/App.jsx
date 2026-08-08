import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Stage, Layer, Line } from 'react-konva';

const socket = io('http://localhost:4000');

function App() {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const isDrawing = useRef(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));

    socket.on('draw-line', (lineData) => {
      setLines((prev) => [...prev, lineData]);
    });

    return () => {
      socket.off('draw-line');
      socket.off('connect');
    };
  }, []);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = { points: [pos.x, pos.y] };
    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];
      const updatedLine = {
        ...lastLine,
        points: [...lastLine.points, point.x, point.y],
      };
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
      <p style={styles.subtitle}>Draw below — open a second tab to see it sync live</p>

      <div style={styles.canvasWrap}>
        <Stage
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          style={{ background: '#fff', borderRadius: '8px' }}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke="#111"
                strokeWidth={3}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', padding: '40px 30px' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '820px', margin: '0 auto' },
  title: { fontSize: '32px', margin: 0, fontWeight: 700 },
  status: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  subtitle: { maxWidth: '820px', margin: '10px auto 20px', color: '#94a3b8' },
  canvasWrap: { maxWidth: '820px', margin: '0 auto' },
};

export default App;