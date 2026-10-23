let canvas;
let ctx;
let options;
let drops = [];
let width = 0;
let height = 0;
let active = false;
let timer = 0;

function color(column) {
  if (options.fixedColor) return options.fixedColor;
  if (options.variant === "rainbow") return `hsl(${(Date.now() / 20 + column * 10) % 360}, 85%, 55%)`;
  return options.variant === "cyan" ? "#22d3ee" : "#22c55e";
}

function draw() {
  if (options.transparent) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.075)";
  } else {
    ctx.fillStyle = "rgba(8,7,12,0.075)";
  }
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";
  ctx.font = `${options.cell}px monospace`;
  const chars = "??????????????????????????????0123456789";
  for (let column = 0; column < drops.length; column++) {
    const drop = drops[column];
    ctx.fillStyle = color(column);
    ctx.fillText(chars[Math.floor(Math.random() * chars.length)], column * options.cell, drop * options.cell);
    drops[column] = drop * options.cell > height && Math.random() > .975 ? 0 : drop + 1;
  }
}

function schedule() {
  clearTimeout(timer);
  if (!active) return;
  timer = setTimeout(() => { draw(); schedule(); }, options.interval);
}

self.onmessage = ({ data }) => {
  if (data.type === "init") {
    canvas = data.canvas;
    ctx = canvas.getContext("2d");
    options = data.options;
  } else if (data.type === "configure") {
    options = data.options;
  } else if (data.type === "resize") {
    width = data.width;
    height = data.height;
    canvas.width = Math.round(width * data.dpr);
    canvas.height = Math.round(height * data.dpr);
    ctx.setTransform(data.dpr, 0, 0, data.dpr, 0, 0);
    drops = Array.from({ length: Math.ceil(width / options.cell) }, () => Math.floor(Math.random() * height / options.cell));
    if (!options.transparent) { ctx.fillStyle = "#08070c"; ctx.fillRect(0, 0, width, height); }
    for (let i = 0; i < 24; i++) draw();
  } else if (data.type === "active") {
    active = data.active;
    schedule();
  }
};
