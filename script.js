// Gravity Balls — interactive physics sandbox
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const pauseBtn = document.getElementById('pauseBtn');
const clearBtn = document.getElementById('clearBtn');
const fillBtn = document.getElementById('fillBtn');
const gravityRange = document.getElementById('gravityRange');
const countRange = document.getElementById('countRange');
const ballCountEl = document.getElementById('ballCount');

let DPR = Math.max(1, window.devicePixelRatio || 1);
function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(innerWidth * DPR);
  canvas.height = Math.floor(innerHeight * DPR);
  canvas.style.width = `${innerWidth}px`;
  canvas.style.height = `${innerHeight}px`;
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);
resize();

// Simulation parameters
let gravity = parseFloat(gravityRange.value); // px/frame^2
let balls = [];
const colors = ['#ff8c42','#ffd166','#06d6a0','#118ab2','#073b4c','#ef476f'];
const frictionGround = 0.75; // vertical energy loss on ground
let paused = false;

// Mouse interactions
let mouse = { x: innerWidth/2, y: innerHeight/2, down:false };
let grabbed = null;
let grabOffset = { x:0, y:0 };
let lastMouse = { x: mouse.x, y: mouse.y, t: Date.now() };

canvas.addEventListener('mousemove', (e)=> {
  mouse.x = e.clientX; mouse.y = e.clientY;
  lastMouse = { x: e.clientX, y: e.clientY, t: Date.now() };
});
canvas.addEventListener('mousedown', (e)=>{
  mouse.down = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // try pick nearest ball (within radius)
  let nearest = null, minDist = Infinity;
  for (let b of balls) {
    const dx = b.x - x, dy = b.y - y;
    const d = Math.hypot(dx,dy);
    if (d < b.radius*1.4 && d < minDist) { nearest = b; minDist = d; }
  }

  if (nearest) {
    grabbed = nearest;
    grabbed.vx = grabbed.vx || 0; grabbed.vy = grabbed.vy || 0;
    grabOffset.x = x - grabbed.x; grabOffset.y = y - grabbed.y;
    grabbed.isKinematic = true;
  } else {
    // spawn a new ball at click point
    spawnBall(x, y);
  }
});
canvas.addEventListener('mouseup', (e)=>{
  mouse.down = false;
  if (grabbed) {
    // compute fling velocity from mouse movement
    const speedMultiplier = 0.25;
    const dx = (mouse.x - lastMouse.x);
    const dt = (Date.now() - lastMouse.t) / 1000 || 0.016;
    grabbed.vx = dx / dt * speedMultiplier;
    const dy = (mouse.y - lastMouse.y);
    grabbed.vy = dy / dt * speedMultiplier;
    grabbed.isKinematic = false;
    grabbed = null;
  }
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  // repel effect — push nearby balls away
  const x = e.clientX, y = e.clientY;
  repelAt(x,y,200,8); // radius px, strength
});

// Keyboard
window.addEventListener('keydown', (e)=>{
  if (e.code === 'Space') { togglePause(); }
  if (e.key === 'c') { clearAll(); }
});

// UI wiring
gravityRange.addEventListener('input', ()=> gravity = parseFloat(gravityRange.value));
pauseBtn.addEventListener('click', togglePause);
clearBtn.addEventListener('click', clearAll);
fillBtn.addEventListener('click', ()=> {
  const n = parseInt(countRange.value,10);
  spawnMany(n);
});

// Ball class
class Ball {
  constructor(x,y,radius, color){
    this.x = x; this.y = y;
    this.vx = (Math.random()-0.5)*2;
    this.vy = (Math.random()-0.5)*2;
    this.radius = radius;
    this.color = color;
    this.mass = radius*0.6;
    this.isKinematic = false; // when grabbed
  }
  draw(ctx){
    // fill
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
    const grad = ctx.createRadialGradient(this.x - this.radius*0.3, this.y - this.radius*0.3, this.radius*0.1,
                                          this.x, this.y, this.radius*1.1);
    grad.addColorStop(0, lighten(this.color,0.18));
    grad.addColorStop(1, this.color);
    ctx.fillStyle = grad;
    ctx.fill();
    // stroke
    ctx.lineWidth = Math.max(1, this.radius*0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke();
  }
}

// Utilities
function rand(min,max){ return Math.random()*(max-min)+min; }
function lighten(hex, amount){
  // simple lighten for hex like #rrggbb, amount 0..1
  const num = parseInt(hex.slice(1),16);
  let r = (num>>16)+Math.round(255*amount);
  let g = ((num>>8)&0xff)+Math.round(255*amount);
  let b = (num&0xff)+Math.round(255*amount);
  r=Math.min(255,r); g=Math.min(255,g); b=Math.min(255,b);
  return `rgb(${r},${g},${b})`;
}

// spawn helpers
function spawnBall(x,y){
  const r = rand(8, 28);
  const color = colors[Math.floor(Math.random()*colors.length)];
  const b = new Ball(x, y, r, color);
  balls.push(b);
  updateHUD();
}
function spawnMany(n=20){
  for (let i=0;i<n;i++){
    const x = rand(20, innerWidth-20);
    const y = rand(20, innerHeight/3);
    spawnBall(x,y);
  }
}

// physics steps
function step(dt=1/60){
  // update velocities & positions
  for (let i=0;i<balls.length;i++){
    const b = balls[i];
    if (b.isKinematic) {
      // follow mouse
      b.x = mouse.x - grabOffset.x;
      b.y = mouse.y - grabOffset.y;
      b.vx = 0; b.vy = 0;
      continue;
    }
    b.vy += gravity * dt * 60; // gravity scaled
    b.x += b.vx * dt * 60;
    b.y += b.vy * dt * 60;

    // wall collisions
    if (b.x - b.radius < 0) { b.x = b.radius; b.vx = -b.vx; }
    if (b.x + b.radius > innerWidth) { b.x = innerWidth - b.radius; b.vx = -b.vx; }
    if (b.y - b.radius < 0) { b.y = b.radius; b.vy = -b.vy; }
    if (b.y + b.radius > innerHeight) {
      b.y = innerHeight - b.radius;
      b.vy = -b.vy * frictionGround;
      // small floor friction
      b.vx *= 0.98;
      if (Math.abs(b.vy) < 0.5) b.vy = 0;
    }
  }

  // ball-ball collisions (pairwise) — naive O(n^2) but fine for moderate counts
  for (let i=0;i<balls.length;i++){
    for (let j=i+1;j<balls.length;j++){
      resolveCollision(balls[i], balls[j]);
    }
  }
}

// elastic collision resolution for circles
function resolveCollision(a, b){
  const dx = b.x - a.x, dy = b.y - a.y;
  const dist = Math.hypot(dx,dy);
  if (dist === 0) return;
  const overlap = a.radius + b.radius - dist;
  if (overlap > 0){
    // push them apart proportional to mass
    const nx = dx/dist, ny = dy/dist;
    const totalMass = a.mass + b.mass;
    const pushA = (overlap * (b.mass/totalMass));
    const pushB = (overlap * (a.mass/totalMass));
    a.x -= nx * pushA;
    a.y -= ny * pushA;
    b.x += nx * pushB;
    b.y += ny * pushB;

    // relative velocity
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const relVelAlongNormal = rvx*nx + rvy*ny;
    if (relVelAlongNormal > 0) return;

    // restitution (elasticity)
    const e = 0.9;
    const j = -(1 + e) * relVelAlongNormal / (1/a.mass + 1/b.mass);

    const impulseX = j * nx;
    const impulseY = j * ny;

    if (!a.isKinematic) { a.vx -= impulseX / a.mass; a.vy -= impulseY / a.mass; }
    if (!b.isKinematic) { b.vx += impulseX / b.mass; b.vy += impulseY / b.mass; }
  }
}

// repel effect
function repelAt(x,y, radius=150, strength=6){
  for (let b of balls){
    const dx = b.x - x, dy = b.y - y;
    const d = Math.hypot(dx,dy);
    if (d < radius && d > 0.01){
      const force = (1 - d/radius) * strength;
      b.vx += (dx/d) * force;
      b.vy += (dy/d) * force;
    }
  }
}

// main loop
let last = performance.now();
function loop(ts){
  if (!paused){
    const dt = Math.min(0.05, (ts - last) / 1000); // cap dt
    step(dt);
    draw();
    last = ts;
  } else {
    last = ts;
  }
  requestAnimationFrame(loop);
}

function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  // subtle floor shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, innerHeight-40, innerWidth, 40);

  for (let b of balls) b.draw(ctx);
  // draw outline for grabbed object
  if (grabbed) {
    ctx.beginPath();
    ctx.arc(grabbed.x, grabbed.y, grabbed.radius+6, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  updateHUD();
}

function updateHUD(){ ballCountEl.textContent = balls.length; }

// helpers
function togglePause(){ paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; }
function clearAll(){ balls = []; updateHUD(); }
function spawnInitial(){ spawnMany(parseInt(countRange.value,10)); }

// initialize
spawnInitial();
requestAnimationFrame(loop);
