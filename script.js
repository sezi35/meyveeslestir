// Game Data - Red and Blue Fruits
const FRUITS = [
    { id: 'elma', name: 'Elma', image: 'assets/elma.jpg', color: 'red' },
    { id: 'cilek', name: 'Çilek', image: 'assets/cilek.jpg', color: 'red' },
    { id: 'yaban_mersini', name: 'Yaban Mersini', image: 'assets/yaban_mersini.jpg', color: 'blue' },
    { id: 'erik', name: 'Erik', image: 'assets/erik.jpg', color: 'blue' }
];

// Slots definition: 2 Red and 2 Blue Slots
const SLOTS = [
    { type: 'red', name: 'Kırmızı Meyve' },
    { type: 'red', name: 'Kırmızı Meyve' },
    { type: 'blue', name: 'Mavi Meyve' },
    { type: 'blue', name: 'Mavi Meyve' }
];

// Audio Context helper for sound synthesis
let audioCtx = null;

function playSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(659.25, now);
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            osc.frequency.setValueAtTime(880.00, now + 0.08);
            gainNode.gain.setValueAtTime(0.15, now + 0.08);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.45);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'victory') {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(audioCtx.destination);
                
                noteOsc.type = 'sine';
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
                
                noteGain.gain.setValueAtTime(0, now + idx * 0.1);
                noteGain.gain.linearRampToValueAtTime(0.15, now + idx * 0.1 + 0.03);
                noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
                
                noteOsc.start(now + idx * 0.1);
                noteOsc.stop(now + idx * 0.1 + 0.35);
            });
        }
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

// Game State
let score = 0;
let moves = 0;
let timerInterval = null;
let secondsElapsed = 0;
let gameStarted = false;
let correctMatches = new Set(); // Stores matched fruit IDs

// DOM Elements
const imagesContainer = document.getElementById('images-container');
const slotsContainer = document.getElementById('slots-container');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const warningBox = document.getElementById('warning-box');
const warningText = document.getElementById('warning-text');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const victoryModal = document.getElementById('victory-modal');
const finalTimeEl = document.getElementById('final-time');
const finalMovesEl = document.getElementById('final-moves');
const playAgainBtn = document.getElementById('play-again-btn');

// Shuffle Utility
function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Timer
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    secondsElapsed = 0;
    gameStarted = true;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay() {
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    timerEl.innerHTML = `Süre: <strong>${mins}:${secs}</strong>`;
}

// Warning Box
let warningTimeout = null;
function showWarning(message) {
    warningText.textContent = message;
    warningBox.classList.add('show');
    
    if (warningTimeout) clearTimeout(warningTimeout);
    warningTimeout = setTimeout(() => {
        warningBox.classList.remove('show');
    }, 3000);
}

// Initialize game
function initGame() {
    stopTimer();
    score = 0;
    moves = 0;
    gameStarted = false;
    correctMatches.clear();
    scoreEl.textContent = '0';
    timerEl.innerHTML = `Süre: <strong>00:00</strong>`;
    warningBox.classList.remove('show');
    victoryModal.classList.remove('show');
    stopConfetti();

    imagesContainer.innerHTML = '';
    slotsContainer.innerHTML = '';

    const shuffledFruits = shuffle(FRUITS);
    const shuffledSlots = shuffle(SLOTS);

    // Create cards
    shuffledFruits.forEach(fruit => {
        const card = document.createElement('div');
        card.classList.add('fruit-card');
        card.dataset.id = fruit.id;
        
        const img = document.createElement('img');
        img.src = fruit.image;
        img.alt = fruit.name;
        card.appendChild(img);
        
        setupPointerEvents(card);
        imagesContainer.appendChild(card);
    });

    // Create slots
    shuffledSlots.forEach(slotData => {
        const slot = document.createElement('div');
        slot.classList.add('fruit-slot');
        slot.classList.add(slotData.type === 'red' ? 'slot-red' : 'slot-blue');
        slot.dataset.type = slotData.type; // 'red' or 'blue'
        
        const text = document.createElement('span');
        text.classList.add('slot-text');
        text.textContent = slotData.name;
        slot.appendChild(text);

        const bgText = document.createElement('span');
        bgText.classList.add('slot-bg-text');
        bgText.textContent = slotData.type === 'red' ? 'Kırmızı' : 'Mavi';
        slot.appendChild(bgText);
        
        slotsContainer.appendChild(slot);
    });
}

// Drag & Drop Pointer Events
function setupPointerEvents(card) {
    let pointerStartX = 0;
    let pointerStartY = 0;
    let isDragging = false;
    let originalParent = null;
    
    card.addEventListener('pointerdown', (e) => {
        if (correctMatches.has(card.dataset.id)) return;
        
        isDragging = true;
        pointerStartX = e.clientX;
        pointerStartY = e.clientY;
        originalParent = card.parentElement;
        
        card.setPointerCapture(e.pointerId);
        card.classList.add('dragging');
        card.style.touchAction = 'none';

        card.classList.remove('wrong');
        if (originalParent.classList.contains('fruit-slot')) {
            originalParent.classList.remove('wrong');
        }

        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (!gameStarted) {
            startTimer();
        }
    });

    card.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - pointerStartX;
        const dy = e.clientY - pointerStartY;
        
        card.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.08)`;

        const cardRect = card.getBoundingClientRect();
        const cardCX = cardRect.left + cardRect.width / 2;
        const cardCY = cardRect.top + cardRect.height / 2;

        const slots = document.querySelectorAll('.fruit-slot');
        slots.forEach(slot => {
            const isLocked = slot.classList.contains('correct');
            if (isLocked) {
                slot.classList.remove('drag-over');
                return;
            }

            const slotRect = slot.getBoundingClientRect();
            const slotCX = slotRect.left + slotRect.width / 2;
            const slotCY = slotRect.top + slotRect.height / 2;
            
            const distance = Math.hypot(cardCX - slotCX, cardCY - slotCY);
            const isNear = distance < Math.min(slotRect.width, slotRect.height) * 0.7;

            if (isNear) {
                slot.classList.add('drag-over');
            } else {
                slot.classList.remove('drag-over');
            }
        });
    });

    card.addEventListener('pointerup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        card.releasePointerCapture(e.pointerId);
        card.classList.remove('dragging');
        card.style.touchAction = '';

        const activeSlot = document.querySelector('.fruit-slot.drag-over');
        moves++;

        if (activeSlot) {
            activeSlot.classList.remove('drag-over');
            
            const existingCard = activeSlot.querySelector('.fruit-card');
            
            if (existingCard && existingCard !== card) {
                imagesContainer.appendChild(existingCard);
                existingCard.style.transform = '';
                existingCard.classList.remove('correct', 'wrong');
            }

            activeSlot.appendChild(card);
            card.style.transform = '';
            activeSlot.classList.add('has-card');

            if (originalParent && originalParent !== activeSlot && originalParent.classList.contains('fruit-slot')) {
                originalParent.classList.remove('has-card', 'wrong', 'correct');
            }
        } else {
            imagesContainer.appendChild(card);
            card.style.transform = '';
            
            if (originalParent && originalParent.classList.contains('fruit-slot')) {
                originalParent.classList.remove('has-card', 'wrong', 'correct');
            }
        }
    });
}

// Verification Logic
function checkMatches() {
    const slots = document.querySelectorAll('.fruit-slot');
    let filledCount = 0;
    let correctCount = 0;

    slots.forEach(slot => {
        if (slot.querySelector('.fruit-card')) {
            filledCount++;
        }
    });

    if (filledCount < 4) {
        playSound('error');
        showWarning('Lütfen kontrol etmeden önce tüm meyveleri yuvalara yerleştirin!');
        return;
    }

    slots.forEach(slot => {
        const card = slot.querySelector('.fruit-card');
        if (!card) return;

        const slotType = slot.dataset.type; // 'red' or 'blue'
        const cardId = card.dataset.id;
        
        // Find matching fruit details to check its color group
        const fruitObj = FRUITS.find(f => f.id === cardId);
        const cardColor = fruitObj ? fruitObj.color : '';

        if (slotType === cardColor) {
            // Correct Matching: color category matches!
            correctCount++;
            correctMatches.add(cardId);

            slot.classList.remove('wrong');
            slot.classList.add('correct');
            
            card.classList.remove('wrong');
            card.classList.add('correct');

            if (!slot.querySelector('.success-checkmark')) {
                const checkmark = document.createElement('div');
                checkmark.classList.add('success-checkmark');
                checkmark.innerHTML = '<i class="fa-solid fa-check"></i>';
                slot.appendChild(checkmark);
            }
        } else {
            // Incorrect Matching: color mismatch!
            slot.classList.remove('correct');
            slot.classList.add('wrong');
            
            card.classList.remove('correct');
            card.classList.add('wrong');
        }
    });

    score = correctCount;
    scoreEl.textContent = score;

    if (correctCount === 4) {
        handleVictory();
    } else {
        playSound('error');
        showWarning('Bazı eşleştirmeler hatalı! Kırmızı olan meyvelerin yerlerini değiştirerek tekrar deneyin.');
        
        setTimeout(() => {
            slots.forEach(slot => {
                slot.classList.remove('shake');
            });
            const cards = document.querySelectorAll('.fruit-card');
            cards.forEach(card => {
                card.classList.remove('shake');
            });
        }, 600);
    }
}

function handleVictory() {
    stopTimer();
    playSound('victory');
    
    const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    finalTimeEl.textContent = `${mins}:${secs}`;
    finalMovesEl.textContent = moves;
    
    victoryModal.classList.add('show');
    startConfetti();
}

// Confetti
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let confettiActive = false;
let confettiParticles = [];
const confettiColors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316'];

function resizeCanvas() {
    const rect = victoryModal.querySelector('.victory-card').getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

window.addEventListener('resize', () => {
    if (confettiActive) resizeCanvas();
});

class ConfettiParticle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * -100 - 20;
        this.size = Math.random() * 8 + 6;
        this.color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 3 + 2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
        this.shape = Math.random() > 0.5 ? 'circle' : 'square';
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        if (this.y > canvas.height) {
            this.y = -20;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        
        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.restore();
    }
}

function startConfetti() {
    confettiActive = true;
    resizeCanvas();
    confettiParticles = Array.from({ length: 100 }, () => new ConfettiParticle());
    animateConfetti();
}

function stopConfetti() {
    confettiActive = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function animateConfetti() {
    if (!confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiParticles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateConfetti);
}

// Event Listeners
checkBtn.addEventListener('click', () => {
    checkMatches();
});

resetBtn.addEventListener('click', () => {
    initGame();
});

playAgainBtn.addEventListener('click', () => {
    initGame();
});

// Start the game immediately on load
window.addEventListener('DOMContentLoaded', () => {
    initGame();
});
