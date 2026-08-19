const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const fallbackData = {
  updatedAt: null,
  source: { url: "https://store.torecabank.com/mail_buy_list?category=1&types[]=1", category: "ポケモンカードゲーム", productType: "PSA10" },
  stats: { total: 0, recruiting: 0, closed: 0, matchedCount: 0, matchRate: 0, avgPrice: 0, pageCount: 0 },
  items: [],
};

const data = window.TORECABANK_DATA || fallbackData;
const state = {
  query: "",
  status: "all",
  priceMin: null,
  priceMax: null,
  sort: "price-desc",
};

const els = {
  sourceUrl: document.getElementById("sourceUrl"),
  statsLine: document.getElementById("statsLine"),
  totalCount: document.getElementById("totalCount"),
  recruitingCount: document.getElementById("recruitingCount"),
  closedCount: document.getElementById("closedCount"),
  matchRate: document.getElementById("matchRate"),
  avgPrice: document.getElementById("avgPrice"),
  updatedAt: document.getElementById("updatedAt"),
  query: document.getElementById("query"),
  status: document.getElementById("status"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  sort: document.getElementById("sort"),
  items: document.getElementById("items"),
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[‐−–—]/g, "-")
    .replace(/\s+/g, "");
}

function priceText(value) {
  return Number.isFinite(value) && value > 0 ? yen.format(value) : "-";
}

function parseNumber(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function applyFilters(items) {
  const q = normalize(state.query);
  return items.filter((item) => {
    if (state.status !== "all") {
      const shouldBeOpen = state.status === "recruiting";
      if (shouldBeOpen !== item.isRecruiting) return false;
    }
    if (state.priceMin != null && item.price < state.priceMin) return false;
    if (state.priceMax != null && item.price > state.priceMax) return false;
    if (!q) return true;
    const haystack = normalize([
      item.name,
      item.tag,
      item.imageAlt,
      item.itemId,
      item.stockText,
      item.pageNumber,
      item.catalog?.shortName || "",
      item.catalog?.name || "",
    ].join(" "));
    return haystack.includes(q);
  });
}

function sortItems(items) {
  const list = [...items];
  switch (state.sort) {
    case "price-asc":
      list.sort((a, b) => (a.price - b.price) || a.name.localeCompare(b.name, "ja"));
      break;
    case "name-asc":
      list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      break;
    case "name-desc":
      list.sort((a, b) => b.name.localeCompare(a.name, "ja"));
      break;
    case "page-desc":
      list.sort((a, b) => (b.pageNumber - a.pageNumber) || (b.price - a.price));
      break;
    case "match-desc":
      list.sort((a, b) => (b.catalog?.score || 0) - (a.catalog?.score || 0) || (b.price - a.price));
      break;
    case "price-desc":
    default:
      list.sort((a, b) => (b.price - a.price) || a.name.localeCompare(b.name, "ja"));
      break;
  }
  return list;
}

function renderStats() {
  const stats = data.stats || {};
  els.sourceUrl.textContent = data.source?.url || "-";
  els.sourceUrl.title = data.source?.url || "";
  els.statsLine.textContent = `${stats.pageCount || 0}ページ分を走査 / ${stats.total || 0}件を表示`;
  els.totalCount.textContent = String(stats.total || 0);
  els.recruitingCount.textContent = String(stats.recruiting || 0);
  els.closedCount.textContent = String(stats.closed || 0);
  els.matchRate.textContent = stats.matchedCount ? `${stats.matchRate || 0}%` : "準備中";
  els.avgPrice.textContent = priceText(stats.avgPrice || 0);
  els.updatedAt.textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString("ja-JP") : "-";
}

function renderItem(item) {
  const card = document.createElement("article");
  card.className = "card";

  const catalogHtml = item.catalog
    ? `
      <a class="catalog" href="${item.catalog.pageUrl}" target="_blank" rel="noreferrer">
        <img src="${item.catalog.img}" alt="${item.catalog.shortName}" />
        <div>
          <span>みんなのトレカ相場</span>
          <strong>${item.catalog.shortName}</strong>
          <small>${item.catalog.model || ""}</small>
        </div>
      </a>`
    : "";

  card.innerHTML = `
    <a class="thumb" href="${item.pageUrl}" target="_blank" rel="noreferrer">
      <img src="${item.imageUrl}" alt="${item.imageAlt}" />
      <span class="badge">${item.isRecruiting ? "募集中" : "受付終了"}</span>
    </a>
    <div class="body">
      <div class="title-row">
        <div>
          <p class="eyebrow">TorecaBank / ${item.tag || "PSA10"}</p>
          <h3>${item.name}</h3>
        </div>
        <div class="price">${priceText(item.price)}</div>
      </div>
      <div class="chips">
        <span class="chip">${item.itemKey}</span>
        <span class="chip">${item.pageNumber}ページ目</span>
        <span class="chip">${item.stockText || "在庫不明"}</span>
        ${item.isCustomItem ? '<span class="chip good">カスタム</span>' : '<span class="chip">通常</span>'}
        ${item.catalog ? `<span class="chip warn">照合スコア ${item.catalog.score}</span>` : ""}
      </div>
      <div class="meta-grid">
        <div class="meta">
          <span>商品ID</span>
          <strong>${item.itemId}</strong>
        </div>
        <div class="meta">
          <span>掲載状況</span>
          <strong>${item.isRecruiting ? "募集中" : "受付終了"}</strong>
        </div>
      </div>
      ${catalogHtml}
      <div class="links">
        <a href="${item.pageUrl}" target="_blank" rel="noreferrer">元ページを開く</a>
        ${item.addUrl ? `<a href="${item.addUrl}" target="_blank" rel="noreferrer">追加リンク</a>` : ""}
      </div>
    </div>
  `;

  return card;
}

function render() {
  const filtered = sortItems(applyFilters(data.items || []));
  els.items.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "条件に合うカードがありません。";
    els.items.appendChild(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const item of filtered) {
    fragment.appendChild(renderItem(item));
  }
  els.items.appendChild(fragment);
}

function bind() {
  els.query.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
  els.status.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });
  els.priceMin.addEventListener("input", (event) => {
    state.priceMin = parseNumber(event.target.value);
    render();
  });
  els.priceMax.addEventListener("input", (event) => {
    state.priceMax = parseNumber(event.target.value);
    render();
  });
  els.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    render();
  });
}

renderStats();
bind();
render();
