const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('test-message', (data) => {
    console.log('received:', data);
    socket.broadcast.emit('test-message', data);
  });

  socket.on('draw-line', (lineData) => {
    socket.broadcast.emit('draw-line', lineData);
  });

  socket.on('disconnect', () => console.log('user disconnected'));
});

server.listen(4000, () => console.log('server running on 4000'));