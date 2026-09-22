import { createRenderer as createBase } from './renderer.js';
// Wraps the 3D or fan renderer with a 2D compositing pass: the base always
// renders on transparent, so the additive bloom only picks up leaf color.
// With glow on, the crisp source is replaced by a lightly blurred "core"
// (a soft gradient at the shape's own edge, not just the outer halo) and a
// repeating noise tile overlaid with 'overlay' blend, which only lifts
// pixels that already have some brightness — pure black stays pure black.
const passes = [
  { blur: 0.012, alpha: 0.55 },
  { blur: 0.03, alpha: 0.32 },
  { blur: 0.065, alpha: 0.2 },
];
function makeNoiseTile(size = 200) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const tctx = tile.getContext('2d');
  const image = tctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  tctx.putImageData(image, 0, 0);
  return tile;
}
const noiseTile = typeof document === 'undefined' ? null : makeNoiseTile();
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
    if (!glow?.enabled) {
      ctx.drawImage(base.canvas, 0, 0);
      return;
    }
    const unit = Math.min(canvas.width, canvas.height);
    const strength = glow.intensity / 100;
    const reach = glow.radius / 50;
    ctx.globalCompositeOperation = 'lighter';
    for (const pass of passes) {
      ctx.filter = `blur(${Math.max(1, pass.blur * unit * reach)}px)`;
      ctx.globalAlpha = pass.alpha * strength;
      ctx.drawImage(base.canvas, 0, 0);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = `blur(${Math.max(0.6, unit * 0.0035 * reach)}px)`;
    ctx.globalAlpha = 1;
    ctx.drawImage(base.canvas, 0, 0); // feathered core: a gradient at the silhouette edge instead of a crisp vector line
    ctx.filter = 'none';
    if (glow.grain > 0) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = (glow.grain / 100) * 0.9;
      ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
      ctx.save();
      ctx.translate((time * 131) % noiseTile.width, (time * 97) % noiseTile.height);
      ctx.fillRect(
        -noiseTile.width,
        -noiseTile.height,
        canvas.width + noiseTile.width * 2,
        canvas.height + noiseTile.height * 2,
      );
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function dispose() {
    base.dispose();
    canvas.width = 1;
    canvas.height = 1;
  }
  return { canvas, renderAt, resize, dispose };
}
