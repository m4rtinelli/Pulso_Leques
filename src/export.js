import {fanSVG} from './fan.js';
import { createRenderer } from "./glow.js";

function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leque-${new Date().toISOString().replace(/[:.]/g, "-")}.${extension}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function exportStill(
  config,
  time,
  type,
  { scale = 1, transparent = false } = {},
) {
  if(type==='svg'){if(config.mode!=='fan')throw new Error('SVG disponível no modo leque.');download(new Blob([fanSVG(config,time,transparent)],{type:'image/svg+xml'}),'svg');return;}
  const view=createRenderer(config,{scale,transparent});
  try{view.renderAt(time,config);const blob=await new Promise(resolve=>view.canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Não foi possível gerar PNG.');download(blob,'png');}finally{view.dispose();}
}

/** Frame-by-frame encoding: video timing is independent of preview or machine speed. */
export async function exportVideo(
  config,
  { scale = 1, fps = 30, signal, onProgress = () => {} } = {},
) {
  const {
    Output,
    Mp4OutputFormat,
    BufferTarget,
    CanvasSource,
    canEncodeVideo,
    Quality,
  } = await import("../vendor/mediabunny.mjs");
  signal?.throwIfAborted();
  const width = config.width * scale,
    height = config.height * scale;
  if (!(await canEncodeVideo("avc", { width, height, bitrate: 12_000_000 }))) {
    throw new Error(
      "H.264 indisponível nesta resolução. Tente 1080 px no Chrome ou Edge atualizado.",
    );
  }
  const view=createRenderer(config,{scale});
  const canvas=view.canvas;
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const source = new CanvasSource(canvas, {
    codec: "avc",
    quality: new Quality({ bitrate: scale === 1 ? 12_000_000 : 24_000_000 }),
  });
  output.addVideoTrack(source, { frameRate: fps });
  try {
    await output.start();
    const total = Math.round(config.duration * fps);
    for (let frame = 0; frame < total; frame++) {
      signal?.throwIfAborted();
      view.renderAt(frame / fps,config);
      await source.add(frame / fps, 1 / fps);
      if (frame % 4 === 0) {
        onProgress((frame + 1) / total);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    signal?.throwIfAborted();
    await output.finalize();
    signal?.throwIfAborted();
    onProgress(1);
    download(new Blob([target.buffer], { type: "video/mp4" }), "mp4");
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled")
      await output.cancel().catch(() => {});
    throw error;
  } finally { view.dispose(); }
}
