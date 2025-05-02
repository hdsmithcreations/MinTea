// =============================================
// Game Constants and Configuration
// =============================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 300;
const GROUND_HEIGHT = 20;
const INITIAL_GAME_SPEED = 5;
const CLOUD_SPEED = 1;
const TITLE_FADE_SPEED = 0.005;
const TITLE_DELAY_MAX = 120;
const END_TITLE_FADE_SPEED = 0.02;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// =============================================
// Audio Setup
// =============================================
const gameMusic = document.getElementById('game-music');
const muteButton = document.getElementById('mute-button');
let isMuted = false;

function toggleMute() {
    isMuted = !isMuted;
    gameMusic.muted = isMuted;
    muteButton.textContent = isMuted ? '🔇' : '🔊';
}

muteButton.addEventListener('click', toggleMute);

// =============================================
// Asset Loading
// =============================================
const assets = {
  teacup: new Image(),
  pixelpress: new Image(),
  minty: new Image(),
  title: new Image()
};

// Load all game assets
assets.teacup.src = 'https://cdn.jsdelivr.net/gh/hdsmithcreations/MinTea@main/Assets/teacup51x61.png';
assets.pixelpress.src = 'https://cdn.jsdelivr.net/gh/hdsmithcreations/MinTea@main/Assets/pixelpress52x63.png';
assets.minty.src = 'https://cdn.jsdelivr.net/gh/hdsmithcreations/MinTea@main/Assets/Minty40x60.png';
assets.title.src = 'https://cdn.jsdelivr.net/gh/hdsmithcreations/MinTea@main/Assets/MintyTitle400x160.png';

// Log asset loading status
Object.entries(assets).forEach(([name, img]) => {
  img.onload = () => console.log(`${name} loaded`);
  img.onerror = () => console.error(`Error loading ${name}`);
});

// =============================================
// Game Canvas Setup
// =============================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Responsive canvas sizing
function resizeCanvas() {
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  // Calculate the scale to fit the canvas in the container while maintaining aspect ratio
  const scale = Math.min(
    (containerWidth - 40) / CANVAS_WIDTH, // Account for padding
    (containerHeight - (isMobile ? 80 : 40)) / CANVAS_HEIGHT // Extra space for mobile
  );
  
  // Set the canvas size
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  // Scale the canvas display size
  const displayWidth = CANVAS_WIDTH * scale;
  const displayHeight = CANVAS_HEIGHT * scale;
  
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  
  // Center the canvas
  canvas.style.margin = 'auto';
  canvas.style.display = 'block';
  
  // Adjust for mobile viewport
  if (isMobile) {
    const viewportHeight = window.innerHeight;
    const gameHeight = displayHeight + 80; // Account for mute button and padding
    if (gameHeight > viewportHeight) {
      const newScale = (viewportHeight - 80) / CANVAS_HEIGHT;
      canvas.style.width = `${CANVAS_WIDTH * newScale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * newScale}px`;
    }
  }
}

// Initial resize and add resize listener
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// =============================================
// Game State
// =============================================
const gameState = {
  score: 0,
  gameSpeed: INITIAL_GAME_SPEED,
  isGameOver: false,
  isGameStarted: false,
  titleAlpha: 1.0,
  titleDelay: 0,
  showEndTitle: false,
  endTitleAlpha: 0
};

// =============================================
// Cloud System
// =============================================
class Cloud {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = CANVAS_WIDTH + Math.random() * 100;
    this.y = Math.random() * 100;
    this.width = 60 + Math.random() * 40;
    this.height = 30 + Math.random() * 20;
    this.speed = CLOUD_SPEED + Math.random() * 0.5;
  }

  update() {
    this.x -= this.speed;
    if (this.x + this.width < 0) {
      this.reset();
    }
  }

  draw() {
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.width/2, this.height/2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const clouds = Array(3).fill().map(() => new Cloud());

// =============================================
// Player Character (Minty)
// =============================================
class Minty {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 50;
    this.y = CANVAS_HEIGHT - 80;
    this.width = 40;
    this.height = 60;
    this.isJumping = false;
    this.isDucking = false;
    this.jumpVelocity = 0;
    this.gravity = 0.5;
  }

  jump() {
    if (!this.isJumping && !gameState.isGameOver) {
      this.isJumping = true;
      this.jumpVelocity = 12;
    }
  }

  duck(isDucking) {
    if (!this.isJumping) {
      this.isDucking = isDucking;
      this.height = isDucking ? 27 : 60;
      this.y = CANVAS_HEIGHT - (isDucking ? 47 : 80);
    }
  }

  update() {
    if (this.isJumping) {
      this.y -= this.jumpVelocity;
      this.jumpVelocity -= this.gravity;

      if (this.y >= CANVAS_HEIGHT - 80) {
        this.y = CANVAS_HEIGHT - 80;
        this.isJumping = false;
      }
    }
  }

  draw() {
    ctx.drawImage(assets.minty, this.x, this.y, this.width, this.height);
  }
}

const minty = new Minty();

// =============================================
// Obstacle System
// =============================================
class Obstacle {
  constructor(type) {
    this.isPixelpress = type === 'pixelpress';
    this.isTeacup = type === 'teacup';
    this.width = this.isPixelpress ? 52 : 51;
    this.height = this.isPixelpress ? 53 : 61;
    this.x = CANVAS_WIDTH;
    this.y = this.isPixelpress ? CANVAS_HEIGHT - 113 : CANVAS_HEIGHT - 81;
    this.passed = false;
  }

  update() {
    this.x -= gameState.gameSpeed;
  }

  draw() {
    const image = this.isPixelpress ? assets.pixelpress : assets.teacup;
    ctx.drawImage(image, this.x, this.y, this.width, this.height);
  }

  checkCollision() {
    if (this.isPixelpress) {
      return !minty.isDucking &&
             minty.x + minty.width > this.x &&
             minty.x < this.x + this.width &&
             minty.y < this.y + this.height;
    } else {
      return minty.x + minty.width > this.x &&
             minty.x < this.x + this.width &&
             minty.y + minty.height > this.y;
    }
  }
}

let obstacles = [];

function spawnObstacle() {
  if (Math.random() < 0.02 && obstacles.length < 2) {
    // Check if there's already an obstacle on screen
    const existingObstacle = obstacles.find(obs => obs.isPixelpress || obs.isTeacup);
    
    if (existingObstacle) {
      const distanceFromRight = CANVAS_WIDTH - (existingObstacle.x + existingObstacle.width);
      if (distanceFromRight < 10) return;
    }
    
    // Determine obstacle type based on score
    let type;
    if (gameState.score < 15) {
      type = 'teacup';  // 100% chance for teacups before score 15
    } else {
      type = Math.random() < 0.70 ? 'teacup' : 'pixelpress';  // 70% teacups, 30% pixelpress
    }
    
    obstacles.push(new Obstacle(type));
  }
}

// =============================================
// UI Elements
// =============================================
function drawTitle() {
  if (gameState.titleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = gameState.titleAlpha;
    ctx.drawImage(assets.title, (CANVAS_WIDTH - 400) / 2, (CANVAS_HEIGHT - 160) / 2, 400, 160);
    ctx.restore();
    
    if (gameState.titleDelay < TITLE_DELAY_MAX) {
      gameState.titleDelay++;
    } else {
      gameState.titleAlpha -= TITLE_FADE_SPEED;
      
      if (gameState.titleAlpha <= 0) {
        gameState.isGameStarted = true;
      }
    }
  }
}

function drawEndTitle() {
  if (gameState.endTitleAlpha < 1.0) {
    gameState.endTitleAlpha += END_TITLE_FADE_SPEED;
  }
  
  ctx.save();
  ctx.globalAlpha = gameState.endTitleAlpha;
  
  const titleX = (CANVAS_WIDTH - 400) / 2;
  const titleY = (CANVAS_HEIGHT - 160) / 2 - 110;
  ctx.drawImage(assets.title, titleX, titleY, 400, 160);
  ctx.restore();
  
  // Draw game over text
  ctx.fillStyle = "#000";
  ctx.font = "30px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, titleY + 180);
  ctx.font = "24px Arial";
  ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, titleY + 220);
  ctx.font = "20px Arial";
  ctx.fillText("Press SPACE to restart", CANVAS_WIDTH / 2, titleY + 260);
}

function drawScore() {
  ctx.fillStyle = "#000";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${gameState.score}`, 700, 30);
}

// =============================================
// Game Environment
// =============================================
function drawBackground() {
  // Sky
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Grass
  ctx.fillStyle = "#90EE90";
  ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);
}

// =============================================
// Touch Controls
// =============================================
let touchStartY = 0;
let touchStartTime = 0;

function handleTouchStart(e) {
  e.preventDefault(); // Prevent default touch behavior
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}

function handleTouchEnd(e) {
  e.preventDefault(); // Prevent default touch behavior
  
  if (gameState.isGameOver) {
    resetGame();
    return;
  }
  
  const touchEndY = e.changedTouches[0].clientY;
  const touchEndTime = Date.now();
  const touchDuration = touchEndTime - touchStartTime;
  const touchDistance = touchEndY - touchStartY;
  
  // Quick tap for jump
  if (touchDuration < 200 && Math.abs(touchDistance) < 50) {
    minty.jump();
  }
  // Swipe down for duck
  else if (touchDistance > 50) {
    minty.duck(false); // Release duck
  }
}

// =============================================
// Game Controls
// =============================================
// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    if (gameState.isGameOver) {
      resetGame();
    } else {
      minty.jump();
    }
  } else if (e.code === "ArrowDown") {
    minty.duck(true);
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") {
    minty.duck(false);
  }
});

// Touch controls
if (isMobile) {
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  
  // Prevent scrolling when touching the canvas
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
}

// =============================================
// Game Logic
// =============================================
function resetGame() {
  obstacles = [];
  gameState.score = 0;
  gameState.isGameOver = false;
  gameState.gameSpeed = INITIAL_GAME_SPEED;
  gameState.isGameStarted = false;
  gameState.titleAlpha = 1.0;
  gameState.titleDelay = 0;
  gameState.endTitleAlpha = 0;
  minty.reset();
  
  // Start music when game starts
  if (!isMuted) {
    gameMusic.play().catch(error => console.log("Audio play failed:", error));
  }
  
  requestAnimationFrame(gameLoop);
}

function updateObstacles() {
  obstacles.forEach(obstacle => {
    obstacle.update();

    if (obstacle.checkCollision()) {
      gameState.isGameOver = true;
    }
    
    // Score increase when passing an obstacle
    if (!obstacle.passed && obstacle.x + obstacle.width < minty.x) {
      obstacle.passed = true;
      gameState.score++;
    }
  });

  // Remove off-screen obstacles
  obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
  
  // Increase difficulty over time
  gameState.gameSpeed = INITIAL_GAME_SPEED + Math.floor(gameState.score / 10);
}

// =============================================
// Main Game Loop
// =============================================
function gameLoop() {
  // Clear the canvas with the correct dimensions
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  drawBackground();
  
  // Update and draw clouds
  clouds.forEach(cloud => {
    cloud.update();
    cloud.draw();
  });

  if (gameState.isGameOver) {
    drawEndTitle();
    // Pause music when game is over
    gameMusic.pause();
    return;
  }

  if (gameState.isGameStarted) {
    // Update game state
    minty.update();
    spawnObstacle();
    updateObstacles();

    // Draw game elements
    minty.draw();
    obstacles.forEach(obstacle => obstacle.draw());
    drawScore();
  } else {
    drawTitle();
  }

  requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();