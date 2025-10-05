const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static('public'));

// Rate limit: max 5 wishes per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Твърде много пожелания от този IP, опитайте по-късно."
});
app.use('/api/send-wish', limiter);

// --- Load bad words ---
let badWords = [];
if (fs.existsSync('badwords.json')) {
  badWords = JSON.parse(fs.readFileSync('badwords.json'));
}

// --- Initialize greetings.json ---
const greetingsFile = 'greetings.json';
if (!fs.existsSync(greetingsFile)) fs.writeFileSync(greetingsFile, '[]');

// --- Initialize hearts.json ---
const heartsFile = 'hearts.json';
if (!fs.existsSync(heartsFile)) fs.writeFileSync(heartsFile, JSON.stringify({ count: 0 }));

let greetings = JSON.parse(fs.readFileSync(greetingsFile));
let hearts = JSON.parse(fs.readFileSync(heartsFile));

// --- API for fallback/testing ---
app.get('/api/greetings', (req, res) => res.json(greetings));
app.get('/api/hearts', (req, res) => res.json(hearts));

// --- Socket.IO ---
io.on('connection', (socket) => {
  // Send current data to new client
  socket.emit('init', { greetings, hearts: hearts.count });

  // New wish
  socket.on('new-wish', (data) => {
    const { name, wish, ip } = data;
    // bad words filter
    if (badWords.some(word => wish.toLowerCase().includes(word))) {
      socket.emit('wish-error','Пожеланието съдържа забранени думи!');
      return;
    }
    const newWish = { name, wish, ip, date: new Date() };
    greetings.push(newWish);
    fs.writeFileSync(greetingsFile, JSON.stringify(greetings, null, 2));
    io.emit('update-wishes', newWish);
  });

  // New heart
  socket.on('add-heart', () => {
    hearts.count += 1;
    fs.writeFileSync(heartsFile, JSON.stringify(hearts, null, 2));
    io.emit('update-hearts', hearts.count);
  });
});

// --- Start server ---
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
