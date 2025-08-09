const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gravity = 0.5; // Gravity force
const friction = 0.8; // Bounce damping
const colors = ['#ff4757', '#1e90ff', '#2ed573', '#ffa502', '#ff6b81'];

