const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const fallbackData = {
  updatedAt: null,
  source: { url: "https://store.torecabank.com/mail_buy_list?category=1&types[]=1", category: "ポケモンカードゲーム", productType: "PSA10" },
  stats: { total: 0, recruiting: 0, closed: 0, matchedCount: 0, matchRate: 0, avgPrice: 0, pageCount: 0 },
  items: [],
};

const data = window.TORECABANK_DATA || fallbackData;
const torecaCardsRaw = Array.isArray(window.TORECA_CARD_INDEX?.cards) ? window.TORECA_CARD_INDEX.cards : [];
const sourceMeta = Array.isArray(data.sources) && data.sources.length
  ? data.sources
  : data.source
    ? [data.source]
    : [];
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
  source: "all",
};

const els = {
  sourceUrl: document.getElementById("sourceUrl"),
  sourceSummary: document.getElementById("sourceSummary"),
  statsLine: document.getElementById("statsLine"),
  totalCount: document.getElementById("totalCount"),
  matchRate: document.getElementById("matchRate"),
  avgPrice: document.getElementById("avgPrice"),
  updatedAt: document.getElementById("updatedAt"),
  source: document.getElementById("source"),
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

function normalizeModel(value) {
  return String(value || "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[‐−–—]/g, "-")
    .replace(/[^0-9A-Z/.-]+/g, "");
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

function sourceLabel(sourceKey) {
  return sourceMeta.find((source) => source.key === sourceKey)?.name || sourceKey || "不明";
}

function sourceHref(sourceKey) {
  return sourceMeta.find((source) => source.key === sourceKey)?.url || "";
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

function getGroupKey(item) {
  return item.catalog?.pageUrl || `${item.sourceKey || "bank"}::${item.rawKey || item.itemKey || `${item.name}:${item.model || ""}`}`;
}

function groupByCatalog(items) {
  const groups = new Map();
  for (const item of items || []) {
    const key = getGroupKey(item);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...item,
        groupKey: key,
        sources: [item],
        sourceBreakdown: {
          [item.sourceKey || "bank"]: {
            sourceKey: item.sourceKey || "bank",
            sourceName: item.sourceName || sourceLabel(item.sourceKey || "bank"),
            sourceUrl: item.sourceUrl || sourceHref(item.sourceKey || "bank"),
            count7: item.count7 || 0,
            count30: item.count30 || 0,
            price: item.price || 0,
            priceText: item.priceText || priceText(item.price || 0),
            items: [item],
          },
        },
      });
      continue;
    }

    const sourceKey = item.sourceKey || "bank";
    const breakdown = current.sourceBreakdown[sourceKey] || {
      sourceKey,
      sourceName: item.sourceName || sourceLabel(sourceKey),
      sourceUrl: item.sourceUrl || sourceHref(sourceKey),
      count7: 0,
      count30: 0,
      price: 0,
      priceText: "-",
      items: [],
    };
    breakdown.count7 = (breakdown.count7 || 0) + (item.count7 || 0);
    breakdown.count30 = (breakdown.count30 || 0) + (item.count30 || 0);
    if ((item.price || 0) >= (breakdown.price || 0)) {
      breakdown.price = item.price || 0;
      breakdown.priceText = item.priceText || priceText(item.price || 0);
      breakdown.sourceUrl = item.sourceUrl || breakdown.sourceUrl;
    }
    breakdown.items.push(item);
    current.sourceBreakdown[sourceKey] = breakdown;
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
    if (item.catalog && (!current.catalog || (item.catalog.score || 0) > (current.catalog.score || 0))) {
      current.catalog = item.catalog;
    }
  }

  return [...groups.values()];
}

const rawItems = Array.isArray(data.items) ? data.items : [];
let items = groupByCatalog(rawItems);

function buildSourceStats(list) {
  const stats = new Map();
  for (const source of sourceMeta) {
    stats.set(source.key, {
      key: source.key,
      name: source.name,
      url: source.url,
      total: 0,
      matchedCount: 0,
      matchRate: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      count7: 0,
      count30: 0,
      pageCount: 0,
    });
  }
  for (const item of list || []) {
    const key = item.sourceKey || "bank";
    if (!stats.has(key)) {
      stats.set(key, {
        key,
        name: sourceLabel(key),
        url: sourceHref(key),
        total: 0,
        matchedCount: 0,
        matchRate: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        count7: 0,
        count30: 0,
        pageCount: 0,
      });
    }
    const stat = stats.get(key);
    stat.total += 1;
    stat.matchedCount += item.catalog ? 1 : 0;
    stat.count7 += item.count7 || 0;
    stat.count30 += item.count30 || 0;
    stat.minPrice = stat.minPrice ? Math.min(stat.minPrice, item.price || 0) : item.price || 0;
    stat.maxPrice = Math.max(stat.maxPrice || 0, item.price || 0);
    if (!stat._prices) stat._prices = [];
    if (item.price > 0) stat._prices.push(item.price);
  }
  for (const stat of stats.values()) {
    const prices = stat._prices || [];
    stat.matchRate = stat.total ? Math.round((stat.matchedCount / stat.total) * 100) : 0;
    stat.avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    delete stat._prices;
  }
  return [...stats.values()];
}

function renderSourceSummary() {
  if (!els.sourceSummary) return;
  const stats = buildSourceStats(rawItems);
  els.sourceSummary.innerHTML = stats
    .map(
      (stat) => `
        <article class="source-stat">
          <div class="source-stat-head">
            <strong>${stat.name}</strong>
            <a href="${stat.url}" target="_blank" rel="noreferrer">開く</a>
          </div>
          <div class="source-stat-grid">
            <span><em>掲載</em><b>${stat.total}</b></span>
            <span><em>7日</em><b>${stat.count7}</b></span>
            <span><em>30日</em><b>${stat.count30}</b></span>
            <span><em>照合</em><b>${stat.matchRate}%</b></span>
          </div>
        </article>`
    )
    .join("");
}

function applyFilters(items) {
  const q = normalize(state.query);
  return items.filter((item) => {
    if (state.source !== "all" && !(item.sourceBreakdown && item.sourceBreakdown[state.source])) return false;
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
      Object.values(item.sourceBreakdown || {})
        .map((entry) => `${entry.sourceName} ${entry.count7} ${entry.count30}`)
        .join(" "),
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
  const historyCount = Array.isArray(data.history) ? data.history.length : 0;
  const total30 = Array.isArray(data.history) ? data.history.reduce((sum, item) => sum + (item.count30 || 0), 0) : 0;
  const matchedCount = rawItems.filter((item) => item.catalog).length;
  const matchRate = rawItems.length ? Math.round((matchedCount / rawItems.length) * 100) : 0;
  const groupCount = items.length || 0;
  const sourceCount = sourceMeta.length || 0;
  els.sourceUrl.textContent = sourceMeta.map((source) => source.name).join(" / ") || "-";
  els.sourceUrl.title = sourceMeta.map((source) => source.url).join("\n");
  els.statsLine.textContent = `${sourceCount}サイト / ${rawItems.length || 0}件の掲載 / ${groupCount}件に整理 / ${historyCount}件の30日蓄積`;
  els.totalCount.textContent = String(stats.total || rawItems.length || 0);
  els.matchRate.textContent = matchedCount ? `${matchRate}%` : "準備中";
  els.avgPrice.textContent = priceText(stats.avgPrice || 0);
  els.updatedAt.textContent = data.updatedAt ? new Date(data.updatedAt).toLocaleString("ja-JP") : "-";
  els.totalCount.title = `${total30}回分の掲載回数を蓄積`;
  renderSourceSummary();
}

function renderItem(item) {
  const card = document.createElement("article");
  card.className = "card";
  const catalogUrl = item.catalog?.pageUrl || "";
  const primarySource = Object.values(item.sourceBreakdown || {})[0];
  const itemHref = catalogUrl || primarySource?.sourceUrl || item.sourceUrl || item.pageUrl || "";
  const sourceLinks = Object.values(item.sourceBreakdown || {})
    .map(
      (entry) => `
        <a href="${entry.sourceUrl || item.sourceUrl || item.pageUrl}" target="_blank" rel="noreferrer">
          ${entry.sourceName || sourceLabel(entry.sourceKey)}を開く
        </a>`
    )
    .join("");

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
    <a class="thumb" href="${itemHref}" target="_blank" rel="noreferrer">
      <img src="${item.imageUrl}" alt="${item.imageAlt}" />
    </a>
    <div class="body">
      <div class="title-row">
        <div>
          <p class="eyebrow">${Object.keys(item.sourceBreakdown || {})
            .map((key) => sourceLabel(key))
            .join(" / ") || "掲載"} / ${item.tag || "PSA10"}</p>
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
      <div class="source-breakdown">
        ${Object.values(item.sourceBreakdown || {})
          .map(
            (entry) => `
              <div class="source-row">
                <strong>${entry.sourceName || sourceLabel(entry.sourceKey)}</strong>
                <span>7日 ${entry.count7 || 0} / 30日 ${entry.count30 || 0}</span>
                <small>${priceText(entry.price || 0)}</small>
              </div>`
          )
          .join("")}
      </div>
      ${catalogHtml}
      <div class="links">
        ${item.catalog ? `<a href="${item.catalog.pageUrl}" target="_blank" rel="noreferrer">みんなのトレカ相場を開く</a>` : ""}
        ${sourceLinks}
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
  if (els.source) {
    els.source.innerHTML = ['<option value="all">すべてのサイト</option>']
      .concat(sourceMeta.map((source) => `<option value="${source.key}">${source.name}</option>`))
      .join("");
    els.source.value = state.source;
  }
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
  if (els.source) {
    els.source.addEventListener("change", (event) => {
      state.source = event.target.value;
      render();
    });
  }
}

function init() {
  renderStats();
  bind();
  render();
}

init();
