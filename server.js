// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// In-memory players store: { socketId: {id, x, y, color, name}}
const players = {};

io.on('connection', (socket) => {
  console.log('connected', socket.id);

  // New player joins
  socket.on('new-player', (payload) => {
    // payload can include name, color, etc.
    const spawn = {
      id: socket.id,
      x: payload?.x ?? Math.floor(Math.random() * 400) + 50,
      y: payload?.y ?? Math.floor(Math.random() * 300) + 50,
      color: payload?.color ?? '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
      name: payload?.name ?? 'Player'
    };
    players[socket.id] = spawn;

    // tell the new player about existing players
    socket.emit('current-players', Object.values(players));
    // tell everyone else about the new player
    socket.broadcast.emit('player-joined', spawn);
  });

  // Player moved
  socket.on('move', (pos) => {
    if (!players[socket.id]) return;
    players[socket.id].x = pos.x;
    players[socket.id].y = pos.y;
    // broadcast to others
    socket.broadcast.emit('player-moved', players[socket.id]);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('disconnected', socket.id);
    if (players[socket.id]) {
      // inform others
      socket.broadcast.emit('player-left', { id: socket.id });
      delete players[socket.id];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
