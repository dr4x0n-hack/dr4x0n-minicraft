// client.js
const socket = io();

// Canvas setup
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const playersListEl = document.getElementById('playersList');

const selfId = { id: null };
const players = {}; // id -> {id,x,y,color,name}

// local player state
const local = {
  x: 100,
  y: 100,
  speed: 3,
  color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
  name: 'You'
};

// movement input
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// connect & announce ourselves
socket.on('connect', () => {
  selfId.id = socket.id;
  status.textContent = 'Connected — id: ' + socket.id;
  socket.emit('new-player', { x: local.x, y: local.y, color: local.color, name: local.name });
});

// receive current players
socket.on('current-players', (list) => {
  list.forEach(p => { players[p.id] = p; });
  // ensure our own record exists
  players[socket.id] = { id: socket.id, x: local.x, y: local.y, color: local.color, name: local.name };
  renderPlayersList();
});

// new player joined
socket.on('player-joined', (p) => {
  players[p.id] = p;
  renderPlayersList();
});

// player moved
socket.on('player-moved', (p) => {
  if (!players[p.id]) players[p.id] = p;
  else { players[p.id].x = p.x; players[p.id].y = p.y; }
});

// player left
socket.on('player-left', ({id}) => {
  delete players[id];
  renderPlayersList();
});

// update UI list
function renderPlayersList() {
  const lines = Object.values(players).map(p => `${p.name} (${p.id.slice(0,6)})`);
  playersListEl.innerHTML = lines.join('<br>');
}

// game loop
function update() {
  let moved = false;
  if (keys['arrowup'] || keys['w']) { local.y -= local.speed; moved = true; }
  if (keys['arrowdown'] || keys['s']) { local.y += local.speed; moved = true; }
  if (keys['arrowleft'] || keys['a']) { local.x -= local.speed; moved = true; }
  if (keys['arrowright'] || keys['d']) { local.x += local.speed; moved = true; }

  // clamp to canvas
  local.x = Math.max(10, Math.min(canvas.width-10, local.x));
  local.y = Math.max(10, Math.min(canvas.height-10, local.y));

  // send move if moved
  if (moved) {
    socket.emit('move', { x: local.x, y: local.y });
    // update our copy in players map
    if (players[socket.id]) {
      players[socket.id].x = local.x;
      players[socket.id].y = local.y;
    } else {
      players[socket.id] = { id: socket.id, x: local.x, y: local.y, color: local.color, name: local.name };
    }
  }
}

function draw() {
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // simple grid background
  const grid = 32;
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  for (let x=0; x<canvas.width; x+=grid) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  for (let y=0; y<canvas.height; y+=grid) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
  }

  // draw all players
  for (const id in players) {
    const p = players[id];
    // different style for self
    ctx.fillStyle = (id === socket.id) ? '#ffd700' : (p.color || '#00ff99');
    ctx.fillRect(p.x-10, p.y-10, 20, 20);

    // name
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(p.name, p.x - (p.name.length*3), p.y - 14);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
