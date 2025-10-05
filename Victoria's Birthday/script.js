// --- Connect to Socket.IO server ---
const socket = io();

// --- Elements ---
const wishForm = document.getElementById('wish-form');
const nameInput = document.getElementById('name');
const wishInput = document.getElementById('wish');
const wishList = document.getElementById('wish-list');
const wishSuccess = document.getElementById('wish-success');

const heartBtn = document.getElementById('heart-btn');
const heartCounter = document.getElementById('heart-counter');

const washBtn = document.getElementById('wash-btn');
const confettiCanvas = document.getElementById('confetti');

// --- Connection status ---
socket.on('connect', () => {
  console.log('✅ Connected to server!');
  showMessage('✅ Свързани!', 'success', 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
  showMessage('❌ Връзката е прекъсната', 'error', 3000);
});

// --- Initialize from server ---
socket.on('init', (data) => {
  console.log('📥 Received initial data:', data);
  
  // Clear existing wishes
  wishList.innerHTML = '';
  
  // Load all wishes
  data.greetings.forEach(w => addWishToList(w, false));
  
  // Update hearts count
  heartCounter.textContent = `Сърца: ${data.hearts}`;
});

// --- Update wishes live (real-time for all users) ---
socket.on('update-wishes', (wish) => {
  console.log('✨ New wish received:', wish);
  addWishToList(wish, true);
  
  // Trigger confetti
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
});

// --- Wish error ---
socket.on('wish-error', (msg) => {
  showMessage(msg, 'error', 4000);
});

// --- Update hearts live (real-time for all users) ---
socket.on('update-hearts', (count) => {
  console.log('💖 Hearts updated:', count);
  heartCounter.textContent = `Сърца: ${count}`;
  
  // Small confetti burst for hearts
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 }
  });
});

// --- Heart error ---
socket.on('heart-error', (msg) => {
  showMessage(msg, 'error', 3000);
});

// --- Submit wish ---
wishForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = nameInput.value.trim();
  const wish = wishInput.value.trim();
  
  if (!wish) {
    showMessage('Моля напишете пожелание!', 'error', 3000);
    return;
  }
  
  // Send wish to server
  socket.emit('new-wish', { name, wish });
  
  // Reset form
  wishForm.reset();
  
  // Show success message
  showMessage('Пожеланието е изпратено! 🎉', 'success', 3000);
});

// --- Add wish to list ---
function addWishToList(w, animate = false) {
  const li = document.createElement('li');
  li.textContent = `${w.name || 'Anonymous'}: ${w.wish}`;
  
  if (animate) {
    li.style.opacity = '0';
    li.style.transform = 'translateY(-10px)';
  }
  
  // Add to top of list
  if (wishList.firstChild) {
    wishList.insertBefore(li, wishList.firstChild);
  } else {
    wishList.appendChild(li);
  }
  
  // Animate entrance
  if (animate) {
    setTimeout(() => {
      li.style.transition = 'all 0.5s ease';
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    }, 10);
  }
}

// --- Hearts button ---
heartBtn.addEventListener('click', () => {
  socket.emit('add-heart');
  
  // Visual feedback
  heartBtn.style.transform = 'scale(1.3)';
  setTimeout(() => {
    heartBtn.style.transform = 'scale(1)';
  }, 200);
});

// --- Wash my belly ---
washBtn.addEventListener('click', () => {
  // Big confetti explosion
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, { 
      particleCount, 
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } 
    }));
    confetti(Object.assign({}, defaults, { 
      particleCount, 
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } 
    }));
  }, 250);
  
  showMessage('Time to wash my belly 😎🫧', 'success', 3000);
});

// --- Show message helper ---
function showMessage(text, type = 'success', duration = 3000) {
  wishSuccess.textContent = text;
  wishSuccess.className = type;
  wishSuccess.style.display = 'block';
  
  setTimeout(() => {
    wishSuccess.style.display = 'none';
    wishSuccess.textContent = '';
  }, duration);
}