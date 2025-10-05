const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static('.'));

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

// --- Anti-spam tracking ---
const userActivity = new Map(); // Track user actions by IP/socketId
const WISH_COOLDOWN = 10000; // 10 seconds between wishes
const HEART_COOLDOWN = 2000; // 2 seconds between hearts
const MAX_WISHES_PER_HOUR = 10;

function checkRateLimit(userId, type) {
  const now = Date.now();
  if (!userActivity.has(userId)) {
    userActivity.set(userId, { lastWish: 0, lastHeart: 0, wishCount: 0, hourStart: now });
  }
  
  const activity = userActivity.get(userId);
  
  // Reset hourly counter
  if (now - activity.hourStart > 3600000) {
    activity.wishCount = 0;
    activity.hourStart = now;
  }
  
  if (type === 'wish') {
    if (now - activity.lastWish < WISH_COOLDOWN) {
      return { allowed: false, message: 'Моля изчакайте малко преди следващото пожелание!' };
    }
    if (activity.wishCount >= MAX_WISHES_PER_HOUR) {
      return { allowed: false, message: 'Достигнахте лимита от пожелания за този час!' };
    }
    activity.lastWish = now;
    activity.wishCount++;
    return { allowed: true };
  }
  
  if (type === 'heart') {
    if (now - activity.lastHeart < HEART_COOLDOWN) {
      return { allowed: false, message: 'Моля изчакайте малко преди следващото сърце!' };
    }
    activity.lastHeart = now;
    return { allowed: true };
  }
}

// --- API endpoints ---
app.get('/api/greetings', (req, res) => res.json(greetings));
app.get('/api/hearts', (req, res) => res.json(hearts));

// --- Socket.IO ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send current data to new client
  socket.emit('init', { 
    greetings, 
    hearts: hearts.count 
  });

  // New wish
  socket.on('new-wish', (data) => {
    const { name, wish } = data;
    const userId = socket.handshake.address || socket.id;
    
    // Rate limiting check
    const rateCheck = checkRateLimit(userId, 'wish');
    if (!rateCheck.allowed) {
      socket.emit('wish-error', rateCheck.message);
      return;
    }
    
    // Bad words filter
    if (badWords.some(word => wish.toLowerCase().includes(word.toLowerCase()))) {
      socket.emit('wish-error', 'Пожеланието съдържа забранени думи!');
      return;
    }
    
    // Validate input
    if (!wish || wish.trim().length === 0) {
      socket.emit('wish-error', 'Пожеланието не може да бъде празно!');
      return;
    }
    
    if (wish.length > 500) {
      socket.emit('wish-error', 'Пожеланието е твърде дълго!');
      return;
    }
    
    const newWish = { 
      name: name?.trim() || 'Anonymous', 
      wish: wish.trim(), 
      date: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    
    greetings.push(newWish);
    
    // Save to file
    fs.writeFileSync(greetingsFile, JSON.stringify(greetings, null, 2));
    
    // Broadcast to ALL connected clients (including sender)
    io.emit('update-wishes', newWish);
    
    console.log('New wish added:', newWish);
  });

  // New heart
  socket.on('add-heart', () => {
    const userId = socket.handshake.address || socket.id;
    
    // Rate limiting check
    const rateCheck = checkRateLimit(userId, 'heart');
    if (!rateCheck.allowed) {
      socket.emit('heart-error', rateCheck.message);
      return;
    }
    
    hearts.count += 1;
    
    // Save to file
    fs.writeFileSync(heartsFile, JSON.stringify(hearts, null, 2));
    
    // Broadcast to ALL connected clients
    io.emit('update-hearts', hearts.count);
    
    console.log('Heart added! Total:', hearts.count);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Start server ---
server.listen(PORT, () => {
  console.log(`🎉 Server running on http://localhost:${PORT}`);
  console.log(`💖 Birthday page is ready for Victoria!`);
});