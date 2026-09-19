import { mkdir, copyFile, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
export async function build() {
  const dist = path.join(root, "dist");
  await mkdir(path.join(dist, "vendor"), { recursive: true });
  await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });
  await copyFile(path.join(root, "index.html"), path.join(dist, "index.html"));
  await copyFile(
    path.join(root, "node_modules/p5/lib/p5.min.js"),
    path.join(dist, "vendor/p5.min.js"),
  );
  await copyFile(
    path.join(root, "node_modules/mediabunny/dist/bundles/mediabunny.mjs"),
    path.join(dist, "vendor/mediabunny.mjs"),
  );
  for(const file of ['three.module.js','three.core.js']) await copyFile(path.join(root,'node_modules/three/build',file),path.join(dist,'vendor',file));
  console.log("Build concluído: dist/");
  return dist;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
