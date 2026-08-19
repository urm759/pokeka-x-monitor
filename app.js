const els = {
  cellCount: document.getElementById("cellCount"),
  imageSize: document.getElementById("imageSize"),
  recognizedCount: document.getElementById("recognizedCount"),
  mode: document.getElementById("mode"),
  query: document.getElementById("query"),
  grid: document.getElementById("grid"),
};

const state = {
  mode: "cell",
  query: "",
};

let manifest = null;

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .replace(/[‐−–—]/g, "-");
}

function labelFor(cell) {
  const price = cell.price_text || cell.price_value ? `${cell.price_text || cell.price_value}` : "price pending";
  const name = cell.card_name || "未判別";
  return `${name} / ${price}`;
}

function imageFor(cell) {
  if (state.mode === "card") return `./${cell.card_path}`;
  if (state.mode === "price") return `./${cell.price_path}`;
  return `./${cell.cell_path}`;
}

function matches(cell) {
  const q = normalize(state.query);
  if (!q) return true;
  const hay = normalize(
    [
      cell.index,
      cell.row,
      cell.col,
      cell.card_name,
      cell.card_number,
      cell.set_label,
      cell.price_text,
      cell.price_value,
    ].join(" ")
  );
  return hay.includes(q);
}

function render() {
  if (!manifest) return;
  const cells = manifest.cells.filter(matches);
  els.cellCount.textContent = String(manifest.cellCount);
  els.imageSize.textContent = `${manifest.size.width} × ${manifest.size.height}`;
  els.recognizedCount.textContent = String(manifest.recognizedCount || 0);

  els.grid.innerHTML = cells
    .map(
      (cell) => `
      <article class="tile">
        <img src="${imageFor(cell)}" alt="${labelFor(cell)}" loading="lazy" />
        <div class="tile-head">
          <span class="chip">#${String(cell.index).padStart(2, "0")}</span>
          <span class="chip">R${String(cell.row).padStart(2, "0")} C${String(cell.col).padStart(2, "0")}</span>
        </div>
        <strong>${labelFor(cell)}</strong>
        <div class="tile-head">
          <span>${cell.status || "pending"}</span>
          <span>${cell.card_number || ""}</span>
        </div>
      </article>
    `
    )
    .join("");
}

async function load() {
  if (window.MIST_SHEET_MANIFEST) {
    manifest = window.MIST_SHEET_MANIFEST;
  } else {
    const res = await fetch("./manifest.json", { cache: "no-store" });
    manifest = await res.json();
  }
  render();
}

els.mode.addEventListener("change", () => {
  state.mode = els.mode.value;
  render();
});

els.query.addEventListener("input", () => {
  state.query = els.query.value;
  render();
});

load().catch((err) => {
  console.error(err);
  els.grid.innerHTML = `<div class="tile">読み込みに失敗しました。</div>`;
});
