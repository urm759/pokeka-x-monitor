const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const fallbackData = {
  updatedAt: null,
  source: { url: "https://store.torecabank.com/mail_buy_list?category=1&types[]=1", category: "ポケモンカードゲーム", productType: "PSA10" },
  stats: { total: 0, recruiting: 0, closed: 0, matchedCount: 0, matchRate: 0, avgPrice: 0, pageCount: 0 },
  items: [],
};

const data = window.TORECABANK_DATA || fallbackData;
const torecaCardsRaw = Array.isArray(window.TORECA_CARD_INDEX?.cards) ? window.TORECA_CARD_INDEX.cards : [];
const torecaCards = torecaCardsRaw
  .filter((card) => card && card.pageUrl && (card.img || card.imageUrl) && card.name)
  .map((card) => {
    const shortName = String(card.name).replace(/\[[^\]]+\].*$/, "").replace(/\(.*$/, "").trim();
    return {
      id: card.id,
      name: card.name,
      shortName,
      model: card.model || "",
      pageUrl: card.pageUrl,
      img: card.img || card.imageUrl || "",
      modelKey: normalizeModel(card.model || ""),
      displayKey: matchTextKey(card.name),
      searchKey: normalize(`${card.name} ${card.model || ""}`),
    };
  });

const state = {
  query: "",
  priceMin: null,
  priceMax: null,
  sort: "price-desc",
};

const els = {
  sourceUrl: document.getElementById("sourceUrl"),
  statsLine: document.getElementById("statsLine"),
  totalCount: document.getElementById("totalCount"),
  matchRate: document.getElementById("matchRate"),
  avgPrice: document.getElementById("avgPrice"),
  updatedAt: document.getElementById("updatedAt"),
  query: document.getElementById("query"),
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

function matchTextKey(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[‐−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function priceText(value) {
  return Number.isFinite(value) && value > 0 ? yen.format(value) : "-";
}

function shortName(name) {
  return String(name || "").replace(/\[[^\]]+\].*$/, "").replace(/\(.*$/, "").trim();
}

function parseNumber(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function matchCatalogCard(item) {
  if (!torecaCards.length) return item.catalog || null;
  const itemModelKey = normalize(item.model || "");
  const itemNameKey = matchTextKey(item.name);
  const itemSearchKey = normalize(`${item.name} ${item.model || ""}`);

  let best = null;
  let bestScore = 0;
  for (const card of torecaCards) {
    let score = 0;
    if (itemModelKey && card.modelKey && itemModelKey === card.modelKey) score += 8;
    if (itemModelKey && card.modelKey && (itemModelKey.includes(card.modelKey) || card.modelKey.includes(itemModelKey))) score += 4;
    if (itemNameKey && card.displayKey && (itemNameKey.includes(card.displayKey) || card.displayKey.includes(itemNameKey))) score += 5;
    if (itemSearchKey && card.searchKey && (itemSearchKey.includes(card.searchKey) || card.searchKey.includes(itemSearchKey))) score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  if (!best || bestScore < 5) return item.catalog || null;
  return { ...best, score: bestScore };
}

function attachCatalogMatches(items) {
  return (items || []).map((item) => ({
    ...item,
    catalog: matchCatalogCard(item),
  }));
}

function groupByCatalog(items) {
  const groups = new Map();
  for (const item of items || []) {
    const key = item.catalog?.pageUrl || `${item.name}::${item.model || ""}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...item,
        groupKey: key,
        sources: [item],
      });
      continue;
    }

    current.count7 = (current.count7 || 0) + (item.count7 || 0);
    current.count30 = (current.count30 || 0) + (item.count30 || 0);
    current.sources.push(item);
    if ((item.price || 0) > (current.price || 0)) {
      current.price = item.price;
      current.priceText = item.priceText;
      current.imageUrl = item.imageUrl;
      current.imageAlt = item.imageAlt;
      current.pageUrl = item.pageUrl;
      current.stockText = item.stockText;
      current.isCustomItem = item.isCustomItem;
      current.tag = item.tag;
      current.catalog = item.catalog || current.catalog || null;
    }
  }

  return [...groups.values()];
}

let items = groupByCatalog(attachCatalogMatches(data.items || []));

function applyFilters(items) {
  const q = normalize(state.query);
  return items.filter((item) => {
    if (state.priceMin != null && item.price < state.priceMin) return false;
    if (state.priceMax != null && item.price > state.priceMax) return false;
    if (!q) return true;
    const haystack = normalize([
      item.name,
      item.tag,
      item.imageAlt,
      item.stockText,
      item.sources?.map((source) => source.itemId).join(" "),
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
  const historyCount = Array.isArray(data.history) ? data.history.length : 0;
  const total30 = Array.isArray(data.history) ? data.history.reduce((sum, item) => sum + (item.count30 || 0), 0) : 0;
  const matchedCount = items.filter((item) => item.catalog).length;
  const matchRate = items.length ? Math.round((matchedCount / items.length) * 100) : 0;
  els.statsLine.textContent = `${stats.pageCount || 0}ページ分を走査 / ${items.length || 0}件の現在一覧 / ${historyCount}件の30日蓄積`;
  els.totalCount.textContent = String(stats.total || 0);
  els.matchRate.textContent = matchedCount ? `${matchRate}%` : "準備中";
  els.avgPrice.textContent = priceText(stats.avgPrice || 0);
  els.updatedAt.textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString("ja-JP") : "-";
  els.totalCount.title = `${total30}回分の掲載回数を蓄積`;
}

function renderItem(item) {
  const card = document.createElement("article");
  card.className = "card";
  const catalogUrl = item.catalog?.pageUrl || "";
  const bankUrl = item.pageUrl || "";

  const catalogHtml = item.catalog
    ? `
      <a class="catalog" href="${item.catalog.pageUrl}" target="_blank" rel="noreferrer">
        <img src="${item.catalog.img || item.catalog.imageUrl || ""}" alt="${item.catalog.shortName}" />
        <div>
          <span>みんなのトレカ相場</span>
          <strong>${item.catalog.shortName}</strong>
          <small>${item.catalog.model || ""}</small>
        </div>
      </a>`
    : "";

  card.innerHTML = `
    <a class="thumb" href="${catalogUrl || bankUrl}" target="_blank" rel="noreferrer">
      <img src="${item.imageUrl}" alt="${item.imageAlt}" />
    </a>
    <div class="body">
      <div class="title-row">
        <div>
          <p class="eyebrow">TorecaBank / ${item.tag || "PSA10"}</p>
          <h3>${item.name}</h3>
        </div>
        <div class="price">${priceText(item.price)}</div>
      </div>
      <div class="count-grid">
        <div class="count-box count-box-7">
          <span>直近7日掲載</span>
          <strong>${item.count7 || 0}<small>回</small></strong>
        </div>
        <div class="count-box count-box-30">
          <span>直近30日掲載</span>
          <strong>${item.count30 || 0}<small>回</small></strong>
        </div>
      </div>
      <div class="chips">
        <span class="chip">${item.stockText || "在庫不明"}</span>
        ${item.isCustomItem ? '<span class="chip good">カスタム</span>' : '<span class="chip">通常</span>'}
        ${item.catalog ? `<span class="chip warn">照合 ${item.catalog.shortName}</span>` : ""}
      </div>
      ${catalogHtml}
      <div class="links">
        ${item.catalog ? `<a href="${item.catalog.pageUrl}" target="_blank" rel="noreferrer">みんなのトレカ相場を開く</a>` : ""}
        <a href="${item.pageUrl}" target="_blank" rel="noreferrer">トレカバンクを開く</a>
      </div>
    </div>
  `;

  return card;
}

function render() {
  const filtered = sortItems(applyFilters(items));
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

function init() {
  renderStats();
  bind();
  render();
}

init();
