import { defaults } from "./scene.js";
import { createRenderer } from "./glow.js";
import { exportStill, exportVideo } from "./export.js";
import { mountBezierEditor } from "./bezier-editor.js";

const modeDefaults={three:{...structuredClone(defaults),mode:'three'},fan:{...structuredClone(defaults),mode:'fan',count:7,spread:160,tilt:25,stagger:18,motion:'wave'}};
const config = structuredClone(modeDefaults.three);
const modeStates={};
const $ = (s) => document.querySelector(s);
let time = 3,
  playing = !matchMedia("(prefers-reduced-motion: reduce)").matches,
  selected = 0,
  exporting = false;
const icon = (name) => {
  const paths = {
    play: "M9 5l10 7-10 7z",
    pause: "M8 5v14M16 5v14",
    reset: "M4 10a8 8 0 1 1 1 8M4 4v6h6",
    download: "M12 3v12m-5-5l5 5 5-5M4 16v5h16v-5",
    shuffle:
      "M4 6h3c5 0 5 12 10 12h3m-4-4l4 4-4 4M4 18h3c2 0 3-2 4-4m3-4c1-2 2-4 4-4h2m-4-4l4 4-4 4",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    arrow: "M5 12h14m-5-5l5 5-5 5",
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
};
const range = (id, label, min, max, value, unit = "", step = 1) =>
  `<label class="range-label" for="${id}">${label}<output id="${id}-out">${value}${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}"/>`;

$("#app").innerHTML = `
<header class="topbar"><a class="brand" href="./" aria-label="Leque Studio"><span class="brand-mark"><i></i><i></i><i></i></span><strong>leque</strong><span class="brand-divider"></span><span id="mode-title">Motion 3D</span></a><div class="header-actions"><span class="local-label">Estúdio generativo</span><button id="export-open" class="primary">${icon("download")} Exportar</button></div></header>
<main class="workspace">
  <aside class="inspector" aria-label="Controles da composição">
    <div class="panel-heading"><div><span class="eyebrow">SEU ESTÚDIO</span><h1>Composição</h1></div><button class="icon-button" id="reset" title="Restaurar composição" aria-label="Restaurar composição">${icon("reset")}</button></div>
    <label class="select-label mode-select" for="scene-mode">Modo<select id="scene-mode"><option value="three">Modo 3D</option><option value="fan">Modo leque</option></select></label><div class="tabs" role="tablist" aria-label="Controles"><button role="tab" aria-selected="true" aria-controls="design-panel" id="design-tab">Design</button><button role="tab" aria-selected="false" aria-controls="motion-panel" id="motion-tab" tabindex="-1">Movimento</button></div>
    <div id="design-panel" role="tabpanel" aria-labelledby="design-tab">
      <section><div class="section-title">Estrutura<span>01</span></div>
        ${range("count", "Folhas", 1, 16, 5)}${range("spread", "Distribuição circular", 0, 360, 360, "°")}
        <label class="select-label" for="format">Formato<select id="format"><option value="square">Quadrado · 1:1</option><option value="portrait">Vertical · 9:16</option><option value="landscape">Horizontal · 16:9</option></select></label>
      </section>
      <section><div class="section-title">Folhas<span>02</span></div><div id="bar-selector" class="bar-selector" aria-label="Selecionar folha"></div>
        ${range("bar-height", "Escala da folha", 50, 110, 100, "%")}
        <label class="color-label" for="bar-color">Cor da folha<div><span id="color-hex">#FFAAAB</span><input id="bar-color" type="color" value="#ffaaab" /></div></label><div class="brand-swatches" role="group" aria-label="Cores da marca para a folha">${defaults.colors.map(color=>`<button type="button" data-brand-color="${color}" aria-label="Aplicar ${color.toUpperCase()} à folha" aria-pressed="false"><i style="background:${color}"></i><span>${color.slice(1).toUpperCase()}</span></button>`).join("")}</div>
      </section>
      <section><div class="section-title">Composição<span>03</span></div>
        ${range("rotation", "Orientação", -180, 180, 0, "°")}${range("tilt", "Câmera · elevação", -60, 75, 25, "°")}${range("size", "Tamanho", 35, 100, 83, "%")}${range("stagger", "Fase do ciclo", 0, 40, 0, "%")}
      </section>
      <section><div class="section-title">Paleta<span>04</span></div><div class="palettes"><button class="palette active" data-palette="0" aria-label="Aplicar paleta da marca a todas as folhas"><i style="--c:#ffaaab"></i><i style="--c:#f0ffbf"></i><i style="--c:#ccfa36"></i><i style="--c:#ff4347"></i></button></div><p class="hint">Aplicar as cores da marca a todas as folhas.</p>
        <label class="color-label" for="background">Fundo da arte<input id="background" type="color" value="#f1eee7"/></label>
      </section>
      <section><div class="section-title">Brilho<span>05</span></div><label class="check-label" for="glow-enabled"><input id="glow-enabled" type="checkbox"/> Ativar brilho</label>
        ${range("glow-intensity", "Intensidade", 0, 100, 55, "%")}${range("glow-radius", "Alcance", 0, 100, 50, "%")}${range("glow-grain", "Grão", 0, 100, 35, "%")}
        <p class="hint">Brilho aditivo com borda suavizada e grão, como neon. Não incluído na exportação SVG.</p>
      </section>
    </div>
    <div id="motion-panel" role="tabpanel" aria-labelledby="motion-tab" hidden>
      <section><div class="section-title">Abertura<span>01</span></div><div class="preset-grid" id="growth-presets">
        <button data-growth="cascade" class="preset active"><span class="mini-bars stagger"><i></i><i></i><i></i></span>Circular</button><button data-growth="together" class="preset"><span class="mini-bars"><i></i><i></i><i></i></span>Simultâneo</button><button data-growth="breathe" class="preset"><span class="preset-symbol">↕</span>Respirar</button><button data-growth="none" class="preset"><span class="preset-symbol">━</span>Sempre aberto</button>
      </div></section>
      <section><div class="section-title">Movimento das folhas<span>02</span></div><div class="preset-grid" id="motion-presets">
        <button data-motion="wave" class="preset"><span class="preset-symbol">∿</span>Onda</button><button data-motion="flow" class="preset active"><span class="preset-symbol">⇢</span>Girar</button><button data-motion="pulse" class="preset"><span class="preset-symbol">◎</span>Pulsar</button><button data-motion="still" class="preset"><span class="preset-symbol">▦</span>Estático</button>
      </div><p class="hint" id="motion-description">Folhas presas pela base. Frente e verso giram no espaço ao redor da articulação inferior.</p></section>
      <section><div class="section-title">Tempo<span>03</span></div>${range("duration", "Duração", 2, 12, 6, " s")}${range("speed", "Ciclos", 1, 4, 1)}<p class="hint">Abertura e fechamento em ciclo contínuo.</p></section>
    </div>
    <div class="panel-footer"><button id="generate" class="secondary">${icon("shuffle")} Gerar variação</button></div>
  </aside>
  <section class="stage" aria-label="Área de desenho">
    <div class="stage-top"><span><span class="tiny-square"></span> Composição <span class="subtle">/ 01</span></span><span id="size-label">1080 × 1080</span></div>
    <div class="art-area"><div class="art-frame" id="canvas-host"></div></div>
    <div class="stage-bottom"><span id="scene-label">CENA 3D · PIVÔ INFERIOR</span><span id="stage-meta">3 barras · 3 camadas</span></div>
    <div class="transport"><button id="restart" class="icon-button" title="Reiniciar animação" aria-label="Reiniciar animação">${icon("reset")}</button><button id="play" class="play-button" aria-label="Reproduzir">${icon("play")}</button><output id="time-label">03.00</output><input id="timeline" type="range" min="0" max="6" step="0.01" value="3" aria-label="Tempo da animação"/><span id="duration-label">06.00 s</span><span class="transport-divider"></span><label class="loop-label"><input id="loop" type="checkbox" checked/> Repetir</label></div>
  </section>
</main>
<dialog id="export-dialog"><form method="dialog" class="dialog-heading"><div><span class="eyebrow">FINALIZAR</span><h2>Exportar criação</h2></div><button class="close-button" aria-label="Fechar">×</button></form>
  <p class="dialog-description">Cena 3D em PNG ou MP4. SVG não representa a oclusão e o verso das folhas com fidelidade.</p>
  <div class="export-options"><label id="svg-option" hidden><input type="radio" name="export-type" value="svg"/><span><strong>SVG</strong><small>Vetor editável · quadro atual</small></span></label><label><input type="radio" name="export-type" value="png" checked/><span><strong>PNG</strong><small>Imagem em alta resolução</small></span></label><label><input type="radio" name="export-type" value="mp4"/><span><strong>MP4</strong><small>Animação completa · H.264</small></span></label></div>
  <label class="select-label" for="resolution">Resolução<select id="resolution"><option value="1">Original · 1080 px</option><option value="2">Ampliada · 2160 px</option></select></label>
  <label class="select-label" for="fps" id="fps-field" hidden>Quadros por segundo<select id="fps"><option value="30">30 fps</option><option value="60">60 fps</option></select></label>
  <label class="check-label" id="transparent-field"><input type="checkbox" id="transparent"/> Fundo transparente</label>
  <p class="hint" id="export-hint">PNG captura a cena 3D no quadro selecionado. MP4 exporta o movimento completo.</p>
  <progress id="export-progress" value="0" max="1" hidden></progress><p id="export-status" role="status" aria-live="polite"></p>
  <div class="dialog-actions"><button id="cancel-export" class="secondary" hidden>Cancelar</button><button id="export-submit" class="primary">${icon("download")} Exportar PNG</button></div>
</dialog><div class="toast" id="toast" role="status"></div>`;

const easingSection = document.createElement("section");
$("#motion-panel").insertBefore(
  easingSection,
  $("#motion-panel").lastElementChild,
);
const bezierEditor = mountBezierEditor(easingSection, config, () => {
  time = 0;
  setPlaying(true);
  syncTime();
});
const canvasHost = $("#canvas-host");
let preview = createRenderer(config);
canvasHost.append(preview.canvas);
preview.canvas.setAttribute('aria-label','Símbolos articulados em 3D pelo ponto inferior');preview.canvas.setAttribute('role','img');
let previous=performance.now();
function animate(now){
 const delta=Math.min((now-previous)/1000,.1);previous=now;
 if(playing&&!exporting){time+=delta;if(time>=config.duration){if($('#loop').checked)time%=config.duration;else{time=config.duration;setPlaying(false);}}syncTime();}
 preview.renderAt(time,config);requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
window.addEventListener('pagehide',()=>preview.dispose(),{once:true});

function syncTime() {
  $("#timeline").value = time;
  $("#time-label").value = time.toFixed(2).padStart(5, "0");
}
function setPlaying(value) {
  playing = value;
  $("#play").innerHTML = icon(value ? "pause" : "play");
  $("#play").setAttribute("aria-label", value ? "Pausar" : "Reproduzir");
}
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 3000);
}
function setRange(id, value) {
  $(`#${id}`).value = value;
  $(`#${id}-out`).value = value + $(`#${id}`).dataset.unit;
}
function syncBar() {
  setRange("bar-height", config.heights[selected]);
  $("#bar-color").value = config.colors[selected];
  $("#color-hex").textContent = config.colors[selected].toUpperCase();
  document.querySelectorAll("[data-brand-color]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.brandColor===config.colors[selected].toLowerCase()));
}
function renderBarSelector() {
  $("#bar-selector").innerHTML = Array.from(
    { length: config.count },
    (_, i) =>
      `<button style="--bar-color:${config.colors[i]}" class="${i === selected ? "selected" : ""}" data-bar="${i}" aria-pressed="${i === selected}" aria-label="Selecionar folha ${i + 1}"><i></i>${String(i + 1).padStart(2, "0")}</button>`,
  ).join("");
  $("#stage-meta").textContent =
    `${config.count} folhas · símbolo original`;
}
// Each bar keeps an independent color even when the bar count changes.
config.colors = Array.from({ length: 16 }, (_, i) => defaults.colors[i % defaults.colors.length]);
renderBarSelector();
$("#bar-selector").addEventListener("click", (e) => {
  const b = e.target.closest("[data-bar]");
  if (!b) return;
  selected = +b.dataset.bar;
  renderBarSelector();
  syncBar();
});
function bindRange(id, callback) {
  $(`#${id}`).addEventListener("input", (e) => {
    const v = +e.target.value;
    setRange(id, v);
    callback(v);
  });
}
for (const key of ["spread", "rotation", "tilt", "size", "stagger", "speed"])
  bindRange(key, (v) => (config[key] = v));
bindRange("count", (v) => {
  for(let i=config.count;i<v;i++) config.colors[i]=defaults.colors[i%defaults.colors.length];
  config.count = v;
  selected = Math.min(selected, v - 1);
  renderBarSelector();
  syncBar();
});
bindRange("bar-height", (v) => (config.heights[selected] = v));
$("#glow-enabled").addEventListener(
  "change",
  (e) => (config.glow.enabled = e.target.checked),
);
bindRange("glow-intensity", (v) => (config.glow.intensity = v));
bindRange("glow-radius", (v) => (config.glow.radius = v));
bindRange("glow-grain", (v) => (config.glow.grain = v));
bindRange("duration", (v) => {
  time = (time / config.duration) * v;
  config.duration = v;
  $("#timeline").max = v;
  $("#duration-label").textContent = v.toFixed(2).padStart(5, "0") + " s";
  syncTime();
});
$("#bar-color").addEventListener("input", (e) => {
  config.colors[selected] = e.target.value;
  syncBar();
  renderBarSelector();
});
$("#background").addEventListener(
  "input",
  (e) => (config.background = e.target.value),
);
$("#format").addEventListener("change", (e) => {
  [config.width, config.height] = {
    square: [1080, 1080],
    portrait: [1080, 1920],
    landscape: [1920, 1080],
  }[e.target.value];
  preview.resize(config.width, config.height);
  canvasHost.style.aspectRatio = `${config.width}/${config.height}`;
  canvasHost.style.setProperty("--art-ratio", config.width / config.height);
  $("#size-label").textContent = `${config.width} × ${config.height}`;
});
const palettes = [
  defaults.colors,
  ["#ff6100", "#2e43ff", "#212121"],
  ["#202124", "#74767c", "#b9bbc0"],
];
document.querySelectorAll("[data-palette]").forEach(
  (b) =>
    (b.onclick = () => {
      config.colors = Array.from(
        { length: 16 },
        (_, i) => palettes[+b.dataset.palette][i % palettes[+b.dataset.palette].length],
      );
      document
        .querySelectorAll("[data-palette]")
        .forEach((p) => p.classList.toggle("active", p === b));
      renderBarSelector();
      syncBar();
    }),
);
for (const group of ["growth", "motion"])
  document.querySelectorAll(`[data-${group}]`).forEach(
    (b) =>
      (b.onclick = () => {
        config[group] = b.dataset[group];
        document
          .querySelectorAll(`[data-${group}]`)
          .forEach((p) => p.classList.toggle("active", p === b));
        time = 0;
        setPlaying(true);
        syncTime();
      }),
  );
function showTab(tab) {
  for (const name of ["design", "motion"]) {
    const on = name === tab;
    $(`#${name}-tab`).setAttribute("aria-selected", on);
    $(`#${name}-tab`).tabIndex = on ? 0 : -1;
    $(`#${name}-panel`).hidden = !on;
  }
}
for (const name of ["design", "motion"]) {
  $(`#${name}-tab`).onclick = () => showTab(name);
  $(`#${name}-tab`).onkeydown = (e) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
      const other = name === "design" ? "motion" : "design";
      showTab(other);
      $(`#${other}-tab`).focus();
    }
  };
}
$("#play").onclick = () => {
  if (time >= config.duration) time = 0;
  setPlaying(!playing);
};
$("#restart").onclick = () => {
  time = 0;
  setPlaying(true);
  syncTime();
};
$("#timeline").oninput = (e) => {
  time = +e.target.value;
  setPlaying(false);
  syncTime();
};
$("#generate").onclick = () => {
  config.heights = Array.from({length:16}, () => Math.round(80 + Math.random()*20));
  config.spread = Math.round(90+Math.random()*160);
  config.rotation = Math.round(-30+Math.random()*60);
  setRange("spread",config.spread); setRange("rotation",config.rotation);
  syncBar();
  time = 0;
  setPlaying(true);
  notify("Nova composição gerada");
};
$("#reset").onclick = () => {
  Object.assign(config, structuredClone(modeDefaults[config.mode]));
  bezierEditor.render();
  config.colors = Array.from({ length: 16 }, (_, i) => defaults.colors[i % defaults.colors.length]);
  selected = 0;
  for (const key of [
    "count",
    "spread",
    "rotation",
    "tilt",
    "size",
    "stagger",
    "duration",
    "speed",
  ])
    setRange(key, config[key]);
  setRange("glow-intensity", config.glow.intensity);
  setRange("glow-radius", config.glow.radius);
  setRange("glow-grain", config.glow.grain);
  $("#glow-enabled").checked = config.glow.enabled;
  $("#format").value = "square";
  $("#format").dispatchEvent(new Event("change"));
  $("#background").value = config.background;
  $("#timeline").max = config.duration;
  $("#duration-label").textContent = "06.00 s";
  document
    .querySelectorAll("[data-palette]")
    .forEach((b) => b.classList.toggle("active", b.dataset.palette === "0"));
  for (const group of ["growth", "motion"])
    document
      .querySelectorAll(`[data-${group}]`)
      .forEach((b) =>
        b.classList.toggle("active", b.dataset[group] === config[group]),
      );
  renderBarSelector();
  syncBar();
  time = 3;
  setPlaying(false);
  syncTime();
  notify("Composição restaurada");
};
document.addEventListener("keydown", (e) => {
  if (
    e.code === "Space" &&
    !["INPUT", "SELECT", "BUTTON"].includes(document.activeElement.tagName) &&
    !$("#export-dialog").open
  ) {
    e.preventDefault();
    $("#play").click();
  }
});

let controller;
$("#export-open").onclick = () => {
  setPlaying(false);
  $("#export-status").textContent = "";
  $('#svg-option').hidden=config.mode!=='fan';
  if(config.mode!=='fan'&&$('[name="export-type"]:checked').value==='svg'){$('[name="export-type"][value="png"]').checked=true;}
  $('[name="export-type"]:checked').onchange();
  $('.dialog-description').textContent=config.mode==='fan'?'Leque em PNG, SVG editável ou MP4.':'Cena 3D em PNG ou MP4. SVG disponível no modo leque.';
  $("#export-dialog").showModal();
};
document.querySelectorAll('[name="export-type"]').forEach(
  (r) =>
    (r.onchange = () => {
      const type = r.value;
      $("#fps-field").hidden = type !== "mp4";
      $("#transparent-field").hidden = type === "mp4";
      $("#resolution").disabled = type === "svg";
      $("#export-submit").innerHTML =
        icon("download") + " Exportar " + type.toUpperCase();
      $("#export-hint").textContent =
        type === "mp4"
          ? "Vídeo completo com fundo opaco. Requer codificação H.264 disponível no navegador."
          : "PNG e SVG capturam o quadro selecionado. MP4 exporta o movimento completo.";
    }),
);
$("#cancel-export").onclick = () => controller?.abort();
$("#export-dialog").addEventListener("cancel", (e) => {
  if (exporting) {
    e.preventDefault();
    controller?.abort();
  }
});
$("#export-submit").onclick = async () => {
  if (exporting) return;
  exporting = true;
  controller = new AbortController();
  const type = $('[name="export-type"]:checked').value;
  const snapshot = structuredClone(config),
    options = {
      scale: +$("#resolution").value,
      transparent: $("#transparent").checked,
      fps: +$("#fps").value,
      signal: controller.signal,
    };
  const controls = [
    ...$("#export-dialog").querySelectorAll("input,select,button"),
  ];
  const states = controls.map((c) => c.disabled);
  controls.forEach((c) => (c.disabled = true));
  $("#cancel-export").disabled = false;
  $("#cancel-export").hidden = type !== "mp4";
  $("#export-progress").hidden = type !== "mp4";
  $("#export-progress").value = 0;
  $("#export-status").textContent = "Preparando arquivo…";
  try {
    if (type === "mp4")
      await exportVideo(snapshot, {
        ...options,
        onProgress: (v) => {
          $("#export-progress").value = v;
          $("#export-status").textContent =
            `Renderizando ${Math.round(v * 100)}%`;
        },
      });
    else await exportStill(snapshot, time, type, options);
    $("#export-status").textContent =
      "Arquivo exportado. Confira seus downloads.";
  } catch (error) {
    $("#export-status").textContent =
      error.name === "AbortError" ? "Exportação cancelada." : error.message;
  } finally {
    exporting = false;
    controls.forEach((c, i) => (c.disabled = states[i]));
    $("#cancel-export").hidden = true;
    $("#export-progress").hidden = true;
  }
};

// Optional agent access, using the same composition state as the visible controls.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  Promise.resolve(
    document.modelContext.registerTool(
      {
        name: "read_composition",
        description: "Read the current fan composition and animation time.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({ config: structuredClone(config), time, playing }),
      },
      { signal: lifecycle.signal },
    ),
  ).catch(() => {});
}

setPlaying(playing); syncBar();

$('#scene-mode').onchange=()=>{
 modeStates[config.mode]={settings:structuredClone(config),time};
 const next=$('#scene-mode').value,saved=modeStates[next];
 Object.assign(config,structuredClone(saved?.settings??modeDefaults[next]));
 config.colors=Array.from({length:16},(_,i)=>config.colors[i%config.colors.length]);
 time=saved?.time??3;selected=0;
 preview.dispose();preview.canvas.remove();preview=createRenderer(config);canvasHost.append(preview.canvas);preview.canvas.setAttribute('role','img');preview.canvas.setAttribute('aria-label',next==='fan'?'Leque vetorial do símbolo':'Símbolos articulados em 3D pelo ponto inferior');
 for(const key of ['count','spread','rotation','tilt','size','stagger','duration','speed'])setRange(key,config[key]);
 setRange('glow-intensity',config.glow.intensity);setRange('glow-radius',config.glow.radius);setRange('glow-grain',config.glow.grain);$('#glow-enabled').checked=config.glow.enabled;
 $('#format').value=config.width===config.height?'square':config.width>config.height?'landscape':'portrait';$('#format').dispatchEvent(new Event('change'));
 $('#background').value=config.background;$('#timeline').max=config.duration;$('#duration-label').textContent=config.duration.toFixed(2)+' s';
 $('#motion-description').textContent=next==='fan'?'Abertura e fechamento em leque, com o contorno original do símbolo.':'Folhas presas pela base. Frente e verso giram no espaço ao redor da articulação inferior.';
 $('#mode-title').textContent=next==='fan'?'Leque vetorial':'Motion 3D';$('#scene-label').textContent=next==='fan'?'LEQUE · VETORIAL':'CENA 3D · PIVÔ INFERIOR';
 document.querySelector('label[for="stagger"]').firstChild.textContent=next==='fan'?'Defasagem':'Fase do ciclo';
 document.querySelector('label[for="spread"]').firstChild.textContent=next==='fan'?'Abertura':'Distribuição circular';
 document.querySelector('label[for="tilt"]').firstChild.textContent=next==='fan'?'Inclinação':'Câmera · elevação';
 for(const group of ['growth','motion'])document.querySelectorAll('[data-'+group+']').forEach(b=>b.classList.toggle('active',b.dataset[group]===config[group]));
 document.querySelectorAll('[data-palette]').forEach(b=>b.classList.remove('active'));
 bezierEditor.render();renderBarSelector();syncBar();syncTime();
};

document.querySelectorAll('[data-brand-color]').forEach(b=>b.onclick=()=>{config.colors[selected]=b.dataset.brandColor;syncBar();renderBarSelector();});

