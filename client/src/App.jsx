import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

function App() {
  const [message, setMessage] = useState('');
  const [received, setReceived] = useState([]);

  useEffect(() => {
    socket.on('test-message', (data) => {
      setReceived((prev) => [...prev, data]);
    });

    return () => {
      socket.off('test-message');
    };
  }, []);

  const sendMessage = () => {
    socket.emit('test-message', message);
    setMessage('');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h2>SyncSpace - Socket Test</h2>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type something..."
      />
      <button onClick={sendMessage}>Send</button>

      <h3>Received messages:</h3>
      <ul>
        {received.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;