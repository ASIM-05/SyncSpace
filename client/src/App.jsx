import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState([]);
  const [connected, setConnected] = useState(false);
  const [userCount, setUserCount] = useState(1);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));

    socket.on('test-message', (data) => {
      setActivity((prev) => [
        { text: data, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    });

    return () => {
      socket.off('test-message');
      socket.off('connect');
    };
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('test-message', message);
    setActivity((prev) => [
      { text: `You: ${message}`, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
    setMessage('');
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

      <p style={styles.subtitle}>
        Real-time sync engine — proof of concept for whiteboard & code editor sync layer
      </p>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Session Activity (live via Socket.io)</h3>
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message to broadcast to other connected sessions..."
          />
          <button style={styles.button} onClick={sendMessage}>
            Broadcast
          </button>
        </div>

        <div style={styles.feed}>
          {activity.length === 0 && (
            <p style={styles.empty}>No activity yet. Open a second tab and send a message.</p>
          )}
          {activity.map((item, i) => (
            <div key={i} style={styles.feedItem}>
              <span style={styles.feedTime}>{item.time}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={styles.footer}>
        Next: Konva.js canvas + Monaco editor synced via this same real-time layer, with Yjs CRDTs for conflict-free collaborative editing.
      </p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', padding: '50px 30px' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '700px', margin: '0 auto' },
  title: { fontSize: '32px', margin: 0, fontWeight: 700 },
  status: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#94a3b8' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },
  subtitle: { maxWidth: '700px', margin: '10px auto 30px', color: '#94a3b8' },
  card: { maxWidth: '700px', margin: '0 auto', background: '#1e293b', borderRadius: '12px', padding: '24px' },
  cardTitle: { margin: '0 0 16px', fontSize: '16px', color: '#e2e8f0' },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '20px' },
  input: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: '14px' },
  button: { padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: 600, cursor: 'pointer' },
  feed: { maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' },
  feedItem: { display: 'flex', gap: '10px', fontSize: '14px', padding: '10px', background: '#0f172a', borderRadius: '6px' },
  feedTime: { color: '#64748b', fontSize: '12px', minWidth: '70px' },
  empty: { color: '#64748b', fontSize: '14px' },
  footer: { maxWidth: '700px', margin: '30px auto 0', color: '#64748b', fontSize: '13px', textAlign: 'center' },
};

export default App;