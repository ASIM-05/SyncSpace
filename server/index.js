const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.json({ status: "active", message: "SyncSpace socket server is running 🚀" });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const roomHistories = new Map();
const roomNotes = new Map();

const normalizeRoomId = (roomId) =>
  typeof roomId === 'string' && /^[a-z0-9-]{3,64}$/i.test(roomId)
    ? roomId.toLowerCase()
    : null;

const isPoint = (pts) =>
  Array.isArray(pts) &&
  pts.length === 2 &&
  Number.isFinite(pts[0]) &&
  Number.isFinite(pts[1]);

const roomFromDoc = (docName) => {
  if (typeof docName !== 'string') return null;
  const match = docName.match(/^syncspace-([a-z0-9-]{3,64})$/i);
  return match ? match[1].toLowerCase() : null;
};

const updateUsersInRoom = async (room) => {
  if (!room) return;
  try {
    const sockets = await io.in(room).fetchSockets();
    const users = sockets.map((s) => ({
      id: s.id,
      username: s.data.username || 'Anonymous',
    }));
    io.to(room).emit('users-list', users);
  } catch (err) {
    console.error('Error fetching sockets in room:', err);
  }
};

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('join-room', (data, callback) => {
    let roomId, username;
    if (typeof data === 'object' && data !== null) {
      roomId = data.roomId;
      username = data.username;
    } else {
      roomId = data;
      username = 'Anonymous';
    }

    const room = normalizeRoomId(roomId);
    if (!room) {
      callback?.({ ok: false, error: 'Invalid room ID.' });
      return;
    }

    const previousRoom = socket.data.room;
    if (previousRoom) {
      socket.leave(previousRoom);
      updateUsersInRoom(previousRoom);
    }

    socket.join(room);
    socket.data.room = room;
    socket.data.username = username || 'Anonymous';

    const history = roomHistories.get(room) || [];
    socket.emit('draw-history', history);

    const notes = roomNotes.get(room) || [];
    socket.emit('notes-history', notes);

    updateUsersInRoom(room);
    callback?.({ ok: true, room });
  });

  socket.on('test-message', (data) => {
    console.log('received:', data);
    if (socket.data.room) socket.to(socket.data.room).emit('test-message', data);
  });

  socket.on('draw-line', (lineData) => {
    const room = socket.data.room;
    if (!room) return;

    const history = roomHistories.get(room) || [];
    history.push(lineData);
    roomHistories.set(room, history);
    socket.to(room).emit('draw-line', lineData);
  });

  socket.on('clear-board', () => {
    const room = socket.data.room;
    if (!room) return;

    roomHistories.set(room, []);
    io.to(room).emit('board-cleared');
  });

  socket.on('add-note', (note) => {
    const room = socket.data.room;
    if (!room) return;
    const notes = roomNotes.get(room) || [];
    notes.push(note);
    roomNotes.set(room, notes);
    io.to(room).emit('notes-history', notes);
  });

  socket.on('edit-note', (updatedNote) => {
    const room = socket.data.room;
    if (!room) return;
    let notes = roomNotes.get(room) || [];
    notes = notes.map((n) => (n.id === updatedNote.id ? { ...n, ...updatedNote } : n));
    roomNotes.set(room, notes);
    io.to(room).emit('notes-history', notes);
  });

  socket.on('delete-note', (noteId) => {
    const room = socket.data.room;
    if (!room) return;
    let notes = roomNotes.get(room) || [];
    notes = notes.filter((n) => n.id !== noteId);
    roomNotes.set(room, notes);
    io.to(room).emit('notes-history', notes);
  });

  socket.on('send-message', (msg) => {
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit('receive-message', msg);
  });

  socket.on('whiteboard-cursor', (data) => {
    const room = socket.data.room;
    if (!room) return;
    socket.to(room).emit('whiteboard-cursor', {
      username: socket.data.username || 'Anonymous',
      x: data.x,
      y: data.y,
      active: data.active
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    const room = socket.data.room;
    if (room) {
      updateUsersInRoom(room);
    }
  });
});

if (require.main === module) {
  const port = process.env.PORT || 4000;
  server.listen(port, () => console.log('server running on ' + port));
}

module.exports = { normalizeRoomId, isPoint, roomFromDoc };
