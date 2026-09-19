const presets = {
  "Suave na saída": [0.22, 1, 0.36, 1],
  Linear: [0, 0, 1, 1],
  Acelerar: [0.42, 0, 1, 1],
  Desacelerar: [0, 0, 0.58, 1],
  "Suave nos dois": [0.42, 0, 0.58, 1],
};

export function mountBezierEditor(host, config, onCommit) {
  host.innerHTML = `<div class="section-title">Curva Bézier<span>EASING</span></div>
    <label class="select-label">Aplicar em<select id="easing-target"><option value="growth">Abertura do leque</option><option value="internal">Ondulação das folhas</option><option value="both">Abertura e ondulação</option></select></label>
    <label class="select-label">Preset<select id="easing-preset">${Object.keys(
      presets,
    )
      .map((name) => `<option>${name}</option>`)
      .join("")}<option value="custom">Personalizado</option></select></label>
    <div class="bezier-plot">
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <path class="bezier-grid" d="M20 20H220V220H20ZM20 70H220M20 120H220M20 170H220M70 20V220M120 20V220M170 20V220"/>
        <path class="bezier-diagonal" d="M20 220L220 20"/>
        <path class="bezier-arm" id="bezier-arm-0"/><path class="bezier-arm second" id="bezier-arm-1"/>
        <path class="bezier-curve" id="bezier-curve"/>
        <circle cx="20" cy="220" r="3"/><circle cx="220" cy="20" r="3"/>
      </svg>
      <button type="button" class="bezier-handle" data-handle="0" aria-label="Ponto 1 da curva. Use as setas para ajustar X e Y">1</button>
      <button type="button" class="bezier-handle second" data-handle="1" aria-label="Ponto 2 da curva. Use as setas para ajustar X e Y">2</button>
    </div><div class="bezier-axes"><span>Progresso ↑</span><span>Tempo →</span></div>
    <div class="bezier-values">${["X1", "Y1", "X2", "Y2"].map((label, i) => `<label>${label}<input data-coordinate="${i}" type="number" min="0" max="1" step="0.01" aria-label="Bézier ${label}"/></label>`).join("")}</div>
    <output class="bezier-code" id="bezier-code"></output>
    <p class="hint">Arraste os pontos ou use as setas. Valores entre 0 e 1, sem ultrapassar os limites do movimento.</p>
    <button type="button" class="secondary bezier-replay">Reproduzir curva</button>`;
  const query = (s) => host.querySelector(s);
  const plot = query(".bezier-plot");
  const handles = [...host.querySelectorAll("[data-handle]")];
  const fields = [...host.querySelectorAll("[data-coordinate]")];
  const bounded = (value) =>
    Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
  function render(preserveInput = false) {
    const [x1, y1, x2, y2] = config.easing;
    query("#bezier-curve").setAttribute(
      "d",
      `M20 220C${20 + x1 * 200} ${220 - y1 * 200} ${20 + x2 * 200} ${220 - y2 * 200} 220 20`,
    );
    query("#bezier-arm-0").setAttribute(
      "d",
      `M20 220L${20 + x1 * 200} ${220 - y1 * 200}`,
    );
    query("#bezier-arm-1").setAttribute(
      "d",
      `M220 20L${20 + x2 * 200} ${220 - y2 * 200}`,
    );
    handles.forEach((handle, i) => {
      handle.style.left = `${(20 + config.easing[i * 2] * 200) / 2.4}%`;
      handle.style.top = `${(220 - config.easing[i * 2 + 1] * 200) / 2.4}%`;
      handle.title = `Ponto ${i + 1}: ${config.easing[i * 2]}, ${config.easing[i * 2 + 1]}`;
    });
    fields.forEach((field, i) => {
      if (!preserveInput || document.activeElement !== field)
        field.value = config.easing[i];
    });
    query("#bezier-code").textContent =
      `cubic-bezier(${config.easing.join(", ")})`;
    query("#easing-target").value = config.easingTarget;
    query("#easing-preset").value =
      Object.keys(presets).find((name) =>
        presets[name].every((v, i) => v === config.easing[i]),
      ) ?? "custom";
  }
  fields.forEach((field, i) => {
    field.addEventListener("input", () => {
      if (field.value.trim() && Number.isFinite(field.valueAsNumber))
        config.easing[i] = bounded(field.valueAsNumber);
      render(true);
    });
    field.addEventListener("blur", () => {
      render();
      onCommit();
    });
  });
  handles.forEach((handle, i) => {
    let dragging = false;
    function move(event) {
      const rect = plot.getBoundingClientRect();
      config.easing[i * 2] = bounded(
        (((event.clientX - rect.left) / rect.width) * 240 - 20) / 200,
      );
      config.easing[i * 2 + 1] = bounded(
        (220 - ((event.clientY - rect.top) / rect.height) * 240) / 200,
      );
      render();
    }
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      handle.focus();
      dragging = true;
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (dragging) move(event);
    });
    handle.addEventListener("pointerup", () => {
      if (dragging) {
        dragging = false;
        onCommit();
      }
    });
    handle.addEventListener("pointercancel", () => {
      dragging = false;
    });
    handle.addEventListener("lostpointercapture", () => {
      dragging = false;
    });
    handle.addEventListener("keydown", (event) => {
      if (
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const axis = ["ArrowLeft", "ArrowRight"].includes(event.key) ? 0 : 1;
      const sign = ["ArrowRight", "ArrowUp"].includes(event.key) ? 1 : -1;
      config.easing[i * 2 + axis] = bounded(
        config.easing[i * 2 + axis] + sign * (event.shiftKey ? 0.1 : 0.01),
      );
      render();
      onCommit();
    });
  });
  query("#easing-preset").onchange = (event) => {
    if (presets[event.target.value])
      config.easing = [...presets[event.target.value]];
    render();
    onCommit();
  };
  query("#easing-target").onchange = (event) => {
    config.easingTarget = event.target.value;
    onCommit();
  };
  query(".bezier-replay").onclick = onCommit;
  render();
  return { render };
}
