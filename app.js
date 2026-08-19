const fmt = new Intl.NumberFormat("ja-JP");
const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const state = {
  cards: [],
  q: "",
  sort: "rank-asc",
  priceMin: null,
  priceMax: null,
  psaMin: null,
  psaMax: null,
  txMin: null,
  rateMin: null,
  page: 1,
  pageSize: 48,
};

const els = {
  qInput: document.getElementById("qInput"),
  sortInput: document.getElementById("sortInput"),
  priceMinInput: document.getElementById("priceMinInput"),
  priceMaxInput: document.getElementById("priceMaxInput"),
  psaMinInput: document.getElementById("psaMinInput"),
  psaMaxInput: document.getElementById("psaMaxInput"),
  txMinInput: document.getElementById("txMinInput"),
  rateMinInput: document.getElementById("rateMinInput"),
  grid: document.getElementById("grid"),
  totalCount: document.getElementById("totalCount"),
  visibleCount: document.getElementById("visibleCount"),
  updatedAt: document.getElementById("updatedAt"),
  pageInfo: document.getElementById("pageInfo"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  copyUrlBtn: document.getElementById("copyUrlBtn"),
};

function normalize(v) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[‐−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(v) {
  return normalize(v).replace(/[^0-9a-zぁ-んァ-ヶ一-龠]+/gi, "");
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function within(value, min, max) {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function sortCards(items) {
  const copy = [...items];
  const sorters = {
    "rank-asc": (a, b) => a.rank - b.rank,
    "rank-desc": (a, b) => b.rank - a.rank,
    "price-desc": (a, b) => b.price - a.price || a.rank - b.rank,
    "price-asc": (a, b) => a.price - b.price || a.rank - b.rank,
    "psa10-desc": (a, b) => b.psa10Price - a.psa10Price || a.rank - b.rank,
    "psa10-asc": (a, b) => a.psa10Price - b.psa10Price || a.rank - b.rank,
    "rate-desc": (a, b) => b.siteAnnualRate - a.siteAnnualRate || a.rank - b.rank,
    "rate-asc": (a, b) => a.siteAnnualRate - b.siteAnnualRate || a.rank - b.rank,
    "tx-desc": (a, b) => b.tx30d - a.tx30d || a.rank - b.rank,
    "tx-asc": (a, b) => a.tx30d - b.tx30d || a.rank - b.rank,
    "name-asc": (a, b) => a.name.localeCompare(b.name, "ja"),
    "name-desc": (a, b) => b.name.localeCompare(a.name, "ja"),
  };
  copy.sort(sorters[state.sort] || sorters["rank-asc"]);
  return copy;
}

function buildShareUrl() {
  const url = new URL(window.location.href);
  if (state.q) url.searchParams.set("q", state.q); else url.searchParams.delete("q");
  url.searchParams.set("sort", state.sort);
  if (state.priceMin != null) url.searchParams.set("priceMin", String(state.priceMin)); else url.searchParams.delete("priceMin");
  if (state.priceMax != null) url.searchParams.set("priceMax", String(state.priceMax)); else url.searchParams.delete("priceMax");
  if (state.psaMin != null) url.searchParams.set("psaMin", String(state.psaMin)); else url.searchParams.delete("psaMin");
  if (state.psaMax != null) url.searchParams.set("psaMax", String(state.psaMax)); else url.searchParams.delete("psaMax");
  if (state.txMin != null) url.searchParams.set("txMin", String(state.txMin)); else url.searchParams.delete("txMin");
  if (state.rateMin != null) url.searchParams.set("rateMin", String(state.rateMin)); else url.searchParams.delete("rateMin");
  url.searchParams.set("page", String(state.page));
  return url;
}

function readUrl() {
  const url = new URL(window.location.href);
  state.q = url.searchParams.get("q") || "";
  state.sort = url.searchParams.get("sort") || "rank-asc";
  state.priceMin = n(url.searchParams.get("priceMin"));
  state.priceMax = n(url.searchParams.get("priceMax"));
  state.psaMin = n(url.searchParams.get("psaMin"));
  state.psaMax = n(url.searchParams.get("psaMax"));
  state.txMin = n(url.searchParams.get("txMin"));
  state.rateMin = n(url.searchParams.get("rateMin"));
  state.page = Math.max(1, n(url.searchParams.get("page")) || 1);
}

function syncControls() {
  els.qInput.value = state.q;
  els.sortInput.value = state.sort;
  els.priceMinInput.value = state.priceMin ?? "";
  els.priceMaxInput.value = state.priceMax ?? "";
  els.psaMinInput.value = state.psaMin ?? "";
  els.psaMaxInput.value = state.psaMax ?? "";
  els.txMinInput.value = state.txMin ?? "";
  els.rateMinInput.value = state.rateMin ?? "";
}

function filteredCards() {
  const query = normalize(state.q);
  const compactQuery = compact(state.q);
  return state.cards.filter((card) => {
    if (query) {
      const hay = normalize([card.name, card.series, card.model, card.psaQuery, card.id].join(" "));
      const compactHay = compact([card.name, card.series, card.model, card.psaQuery, card.id].join(" "));
      if (!hay.includes(query) && !compactHay.includes(compactQuery)) return false;
    }
    if (!within(card.price, state.priceMin, state.priceMax)) return false;
    if (!within(card.psa10Price, state.psaMin, state.psaMax)) return false;
    if (!within(card.tx30d, state.txMin, null)) return false;
    if (state.rateMin != null && card.siteAnnualRate < state.rateMin) return false;
    return true;
  });
}

function render() {
  const filtered = sortCards(filteredCards());
  const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const pageItems = filtered.slice(start, start + state.pageSize);

  els.totalCount.textContent = fmt.format(state.cards.length);
  els.visibleCount.textContent = fmt.format(filtered.length);
  els.pageInfo.textContent = `${state.page} / ${totalPages}`;
  els.prevBtn.disabled = state.page <= 1;
  els.nextBtn.disabled = state.page >= totalPages;

  if (!pageItems.length) {
    els.grid.innerHTML = `<div class="empty card">該当するカードがありません。条件を少しゆるめると表示されます。</div>`;
    return;
  }

  els.grid.innerHTML = pageItems
    .map((card) => {
      const siteRateClass = card.siteAnnualRate >= 80 ? "good" : card.siteAnnualRate >= 50 ? "sky" : "warn";
      return `
        <article class="tile card">
          <a class="thumb" href="${card.pageUrl}" target="_blank" rel="noreferrer">
            <img src="${card.imageUrl}" alt="${card.name}" loading="lazy" />
          </a>
          <div class="tile-body">
            <div class="tile-head">
              <div>
                <p class="eyebrow">#${card.rank} / ${card.id}</p>
                <h3>${card.name}</h3>
              </div>
              <a class="mini-link" href="${card.pageUrl}" target="_blank" rel="noreferrer">元ページ</a>
            </div>
            <div class="chips">
              <span class="chip">${card.series}</span>
              <span class="chip">${card.model || "型番なし"}</span>
              <span class="chip">美品 ${yen.format(card.price)}</span>
              <span class="chip">PSA10 ${yen.format(card.psa10Price)}</span>
              <span class="chip ${siteRateClass}">年利 ${fmt.format(card.siteAnnualRate)}%</span>
              <span class="chip">30日 ${fmt.format(card.tx30d)}件</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateUrl() {
  window.history.replaceState({}, "", buildShareUrl());
}

function syncAndRender(resetPage = false) {
  state.q = els.qInput.value.trim();
  state.sort = els.sortInput.value;
  state.priceMin = n(els.priceMinInput.value);
  state.priceMax = n(els.priceMaxInput.value);
  state.psaMin = n(els.psaMinInput.value);
  state.psaMax = n(els.psaMaxInput.value);
  state.txMin = n(els.txMinInput.value);
  state.rateMin = n(els.rateMinInput.value);
  if (resetPage) state.page = 1;
  render();
  updateUrl();
}

async function loadData() {
  const [cardsRes, metaRes] = await Promise.all([
    fetch("./data/cards.json", { cache: "no-store" }),
    fetch("./data/meta.json", { cache: "no-store" }),
  ]);
  const cardsData = await cardsRes.json();
  const metaData = metaRes.ok ? await metaRes.json() : {};
  state.cards = Array.isArray(cardsData.cards) ? cardsData.cards : [];
  els.updatedAt.textContent = metaData.updatedAt || cardsData.updatedAt || "-";
}

function wire() {
  for (const el of [els.qInput, els.sortInput, els.priceMinInput, els.priceMaxInput, els.psaMinInput, els.psaMaxInput, els.txMinInput, els.rateMinInput]) {
    el.addEventListener("input", () => syncAndRender(true));
    el.addEventListener("change", () => syncAndRender(true));
  }
  els.prevBtn.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    render();
    updateUrl();
  });
  els.nextBtn.addEventListener("click", () => {
    state.page += 1;
    render();
    updateUrl();
  });
  els.copyUrlBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(buildShareUrl().toString());
    els.copyUrlBtn.textContent = "コピーしました";
    setTimeout(() => (els.copyUrlBtn.textContent = "条件URLをコピー"), 1200);
  });
}

async function bootstrap() {
  readUrl();
  syncControls();
  wire();
  await loadData();
  render();
  updateUrl();
}

bootstrap().catch((err) => {
  console.error(err);
  els.grid.innerHTML = `<div class="empty card">一覧の読み込みに失敗しました。</div>`;
});
