const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const roomHistories = new Map();

const normalizeRoomId = (roomId) =>
  typeof roomId === 'string' && /^[a-z0-9-]{3,64}$/i.test(roomId)
    ? roomId.toLowerCase()
    : null;

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('join-room', (roomId, callback) => {
    const room = normalizeRoomId(roomId);

    if (!room) {
      callback?.({ ok: false, error: 'Invalid room ID.' });
      return;
    }

    const previousRoom = socket.data.room;
    if (previousRoom) socket.leave(previousRoom);

    socket.join(room);
    socket.data.room = room;
    const history = roomHistories.get(room) || [];
    socket.emit('draw-history', history);
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

  socket.on('disconnect', () => console.log('user disconnected'));
});

server.listen(4000, () => console.log('server running on 4000'));
