import { createRenderer as createBase } from './renderer.js';
// Wraps the 3D or fan renderer with a 2D compositing pass: the base always
// renders on transparent, so the additive bloom only picks up leaf color,
// then the crisp source is drawn on top and the requested background last.
const passes = [
  { blur: 0.012, alpha: 0.55 },
  { blur: 0.03, alpha: 0.32 },
  { blur: 0.065, alpha: 0.2 },
];
export function createRenderer(config, options = {}) {
  const opaque = !options.transparent;
  const base = createBase(config, { ...options, transparent: true });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  function syncSize() {
    canvas.width = base.canvas.width;
    canvas.height = base.canvas.height;
  }
  syncSize();
  function resize(w, h) {
    base.resize(w, h);
    syncSize();
  }
  function renderAt(time, settings = config) {
    base.renderAt(time, settings);
    const glow = settings.glow;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (opaque) {
      ctx.fillStyle = settings.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (glow?.enabled) {
      const unit = Math.min(canvas.width, canvas.height);
      const strength = glow.intensity / 100;
      const reach = glow.radius / 50;
      ctx.globalCompositeOperation = 'lighter';
      for (const pass of passes) {
        ctx.filter = `blur(${Math.max(1, pass.blur * unit * reach)}px)`;
        ctx.globalAlpha = pass.alpha * strength;
        ctx.drawImage(base.canvas, 0, 0);
      }
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(base.canvas, 0, 0);
  }
  function dispose() {
    base.dispose();
    canvas.width = 1;
    canvas.height = 1;
  }
  return { canvas, renderAt, resize, dispose };
}
