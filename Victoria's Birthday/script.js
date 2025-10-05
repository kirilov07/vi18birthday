// --- Connect to Socket.IO server ---
const socket = io(); // автоматично ще се свърже към същия домейн

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
const confettiSettings = { particleCount: 100, spread: 70 };

// --- Initialize from server ---
socket.on('init', (data) => {
  // Wishes
  data.greetings.forEach(w => addWishToList(w));
  // Hearts
  heartCounter.textContent = `Сърца: ${data.hearts}`;
});

// --- Update wishes live ---
socket.on('update-wishes', (wish) => {
  addWishToList(wish);
  confetti(confettiSettings);
});

// --- Wish error ---
socket.on('wish-error', (msg)=>{
  alert(msg);
});

// --- Update hearts live ---
socket.on('update-hearts', (count)=>{
  heartCounter.textContent = `Сърца: ${count}`;
});

// --- Submit wish ---
wishForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  const name = nameInput.value.trim();
  const wish = wishInput.value.trim();
  if(!wish) return;

  socket.emit('new-wish',{name,wish,ip: ""});
  wishForm.reset();
  wishSuccess.textContent = "Пожеланието е изпратено! 🎉";
  setTimeout(()=>wishSuccess.textContent="",3000);
});

// --- Add wish to list ---
function addWishToList(w){
  const li = document.createElement('li');
  li.textContent = `${w.name || "Anonymous"}: ${w.wish}`;
  wishList.appendChild(li);
}

// --- Hearts ---
heartBtn.addEventListener('click',()=>{
  socket.emit('add-heart');
});

// --- Wash my belly ---
washBtn.addEventListener('click',()=>{
  confetti(confettiSettings);
  alert("Time to wash my belly 😎🫧");
});
