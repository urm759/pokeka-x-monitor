const fmt = new Intl.NumberFormat("ja-JP");
const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const fallbackRows = [
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260818-01",
    postedAt: "2026-08-18T05:00:00+09:00",
    title: "PSA 強化買取買取表 8/6 ポケモンカードPSA10",
    cardName: "リザードンex SAR",
    cardNumber: "349/190",
    setLabel: "SV4a",
    price: 98000,
    confidence: 0.96,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 1",
    dedupeKey: "mist-20260818-01:charizard-98000",
  },
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260818-01",
    postedAt: "2026-08-18T05:00:00+09:00",
    title: "PSA 強化買取買取表 8/6 ポケモンカードPSA10",
    cardName: "お茶会ごっこピカチュウ",
    cardNumber: "325/SM-P",
    setLabel: "PROMO",
    price: 340000,
    confidence: 0.91,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 2",
    dedupeKey: "mist-20260818-01:pikachu-340000",
  },
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260818-02",
    postedAt: "2026-08-18T12:10:00+09:00",
    title: "お持ち込みありがとうございます",
    cardName: "メガカイリューex",
    cardNumber: "114/063",
    setLabel: "M1S",
    price: 38000,
    confidence: 0.89,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 3",
    dedupeKey: "mist-20260818-02:dragonite-38000",
  },
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260818-03",
    postedAt: "2026-08-17T18:40:00+09:00",
    title: "PSA10 強化買取買取表",
    cardName: "ブラッキーex",
    cardNumber: "217/187",
    setLabel: "SV8a",
    price: 85000,
    confidence: 0.92,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 4",
    dedupeKey: "mist-20260817-03:umbreon-85000",
  },
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260817-03b",
    postedAt: "2026-08-17T18:42:00+09:00",
    title: "同日再掲",
    cardName: "ブラッキーex",
    cardNumber: "217/187",
    setLabel: "SV8a",
    price: 85000,
    confidence: 0.92,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 4",
    dedupeKey: "mist-20260817-03:umbreon-85000",
  },
  {
    shopId: "mist",
    shopName: "カードショップMist 名古屋大須店",
    handle: "@Mist_nagoyaosu",
    postId: "mist-20260817-04",
    postedAt: "2026-08-17T21:10:00+09:00",
    title: "PSA 買取表",
    cardName: "ミュウex",
    cardNumber: "347/190",
    setLabel: "SV4a",
    price: 28000,
    confidence: 0.95,
    sourceUrl: "https://x.com/Mist_nagoyaosu",
    imageLabel: "掲載画像 5",
    dedupeKey: "mist-20260817-04:mew-28000",
  },
];

const fallbackData = {
  updatedAt: "2026-08-18T21:00:00+09:00",
  source: {
    kind: "demo",
    accountHandles: ["@Mist_nagoyaosu"],
  },
  shops: [
    {
      shopId: "mist",
      shopName: "カードショップMist 名古屋大須店",
      handle: "@Mist_nagoyaosu",
      profileUrl: "https://x.com/Mist_nagoyaosu",
      active: true,
    },
  ],
  rows: fallbackRows,
};

let rawData = cloneData(fallbackData);
let rawRows = [...fallbackData.rows];

const state = {
  query: "",
  shop: "all",
  min7: 0,
  min30: 1,
  priceMin: null,
  priceMax: null,
  sort: "count30-desc",
};

const els = {
  query: document.getElementById("query"),
  shopFilter: document.getElementById("shopFilter"),
  min7: document.getElementById("min7"),
  min30: document.getElementById("min30"),
  priceMin: document.getElementById("priceMin"),
  priceMax: document.getElementById("priceMax"),
  sort: document.getElementById("sort"),
  cards: document.getElementById("cards"),
  shopRail: document.getElementById("shopRail"),
  shopCount: document.getElementById("shopCount"),
  cardCount: document.getElementById("cardCount"),
  count30: document.getElementById("count30"),
  count7: document.getElementById("count7"),
  dedupeRate: document.getElementById("dedupeRate"),
  updatedAt: document.getElementById("updatedAt"),
};

function normalize(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[‐−–—]/g, "-");
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data || {}));
}

function within(value, min, max) {
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function normalizeData(data) {
  const base = cloneData(data);
  const rows = Array.isArray(base.rows) ? base.rows : Array.isArray(base.listings) ? base.listings : [];
  const shops = Array.isArray(base.shops) ? base.shops : [];
  return {
    updatedAt: base.updatedAt || null,
    source: base.source || null,
    shops,
    rows,
  };
}

function aggregate(rows) {
  const uniques = [];
  const seen = new Set();
  let raw = 0;
  for (const row of rows) {
    raw += 1;
    if (seen.has(row.dedupeKey)) continue;
    seen.add(row.dedupeKey);
    uniques.push(row);
  }

  const byCard = new Map();
  for (const row of uniques) {
    const key = `${row.shopId}:${row.cardName}`;
    const item = byCard.get(key) || {
      shopId: row.shopId,
      shopName: row.shopName,
      handle: row.handle,
      cardName: row.cardName,
      cardNumber: row.cardNumber,
      setLabel: row.setLabel,
      sourceUrl: row.sourceUrl,
      imageLabel: row.imageLabel,
      count30: 0,
      count7: 0,
      prices: [],
      lastSeenAt: row.postedAt,
      confidence: 0,
    };
    item.count30 += 1;
    if (Date.parse(row.postedAt) >= Date.parse("2026-08-11T00:00:00+09:00")) {
      item.count7 += 1;
    }
    item.prices.push(row.price);
    item.lastSeenAt = item.lastSeenAt > row.postedAt ? item.lastSeenAt : row.postedAt;
    item.confidence = Math.max(item.confidence, row.confidence);
    byCard.set(key, item);
  }

  const cards = [...byCard.values()].map((item) => {
    const avgPrice = Math.round(item.prices.reduce((a, b) => a + b, 0) / item.prices.length);
    return {
      ...item,
      avgPrice,
      medianPrice: [...item.prices].sort((a, b) => a - b)[Math.floor(item.prices.length / 2)],
    };
  });

  const totalCount30 = cards.reduce((sum, item) => sum + item.count30, 0);
  const totalCount7 = cards.reduce((sum, item) => sum + item.count7, 0);

  return {
    cards,
    shopCount: new Set(uniques.map((row) => row.shopId)).size,
    cardCount: cards.length,
    count30: totalCount30,
    count7: totalCount7,
    dedupeRate: raw ? Math.round(((raw - uniques.length) / raw) * 100) : 0,
    uniqueRows: uniques.length,
  };
}

function summarizeShops(rows, shops) {
  const uniqueRows = [];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.dedupeKey)) continue;
    seen.add(row.dedupeKey);
    uniqueRows.push(row);
  }
  const shopRows = new Map();
  for (const row of uniqueRows) {
    const key = row.shopId || "unknown";
    const bucket = shopRows.get(key) || {
      shopId: key,
      shopName: row.shopName || key,
      handle: row.handle || "",
      profileUrl: row.sourceUrl || "",
      count30: 0,
      count7: 0,
      latest: row.postedAt,
      uniqueCards: new Set(),
    };
    bucket.count30 += 1;
    if (Date.parse(row.postedAt) >= Date.parse("2026-08-11T00:00:00+09:00")) bucket.count7 += 1;
    bucket.latest = bucket.latest > row.postedAt ? bucket.latest : row.postedAt;
    bucket.uniqueCards.add(row.cardName);
    shopRows.set(key, bucket);
  }
  const shopMeta = new Map((shops || []).map((shop) => [shop.shopId, shop]));
  return [...shopRows.values()].map((shop) => {
    const meta = shopMeta.get(shop.shopId) || {};
    return {
      ...shop,
      shopName: meta.shopName || shop.shopName,
      handle: meta.handle || shop.handle,
      profileUrl: meta.profileUrl || shop.profileUrl,
      active: meta.active !== false,
      uniqueCards: shop.uniqueCards.size,
    };
  });
}

function sortCards(items) {
  const copy = [...items];
  const sorters = {
    "count30-desc": (a, b) => b.count30 - a.count30 || b.count7 - a.count7,
    "count7-desc": (a, b) => b.count7 - a.count7 || b.count30 - a.count30,
    "avgPrice-desc": (a, b) => b.avgPrice - a.avgPrice,
    "avgPrice-asc": (a, b) => a.avgPrice - b.avgPrice,
    "lastSeen-desc": (a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt),
    "lastSeen-asc": (a, b) => Date.parse(a.lastSeenAt) - Date.parse(b.lastSeenAt),
  };
  copy.sort(sorters[state.sort] || sorters["count30-desc"]);
  return copy;
}

function renderShopOptions() {
  const shops = rawData.shops?.length
    ? rawData.shops
    : [...new Map(rawRows.map((row) => [row.shopId, row])).values()].map((row) => ({
        shopId: row.shopId,
        shopName: row.shopName,
        handle: row.handle,
        profileUrl: row.sourceUrl,
        active: true,
      }));
  els.shopFilter.innerHTML = `
    <option value="all">すべて</option>
    ${shops
      .map((row) => `<option value="${row.shopId}">${row.shopName}</option>`)
      .join("")}
  `;
}

function renderShopRail(shops) {
  if (!els.shopRail) return;
  if (!shops.length) {
    els.shopRail.innerHTML = "";
    return;
  }
  els.shopRail.innerHTML = shops
    .map(
      (shop) => `
        <article class="shop-card">
          <div class="shop-card-head">
            <div>
              <span class="shop-label">${shop.handle || shop.shopId}</span>
              <h3>${shop.shopName}</h3>
            </div>
            <a href="${shop.profileUrl || "https://x.com/"}" target="_blank" rel="noreferrer">X</a>
          </div>
          <div class="shop-card-stats">
            <div><span>30日</span><strong>${fmt.format(shop.count30)}</strong></div>
            <div><span>7日</span><strong>${fmt.format(shop.count7)}</strong></div>
            <div><span>型数</span><strong>${fmt.format(shop.uniqueCards)}</strong></div>
          </div>
        </article>
      `
    )
    .join("");
}

function render() {
  const query = normalize(state.query);
  const rows = rawData.rows || rawRows;
  const filtered = rows.filter((row) => {
    if (state.shop !== "all" && row.shopId !== state.shop) return false;
    if (query) {
      const hay = normalize(
        [
          row.shopName,
          row.handle,
          row.title,
          row.cardName,
          row.cardNumber,
          row.setLabel,
          row.postId,
        ].join(" ")
      );
      if (!hay.includes(query)) return false;
    }
    if (!within(row.price, state.priceMin, state.priceMax)) return false;
    return true;
  });

  const agg = aggregate(filtered);
  const shopSummaries = summarizeShops(filtered, rawData.shops || []);
  const cards = agg.cards.filter((item) => item.count7 >= state.min7 && item.count30 >= state.min30);
  const sorted = sortCards(cards);

  els.shopCount.textContent = fmt.format(agg.shopCount);
  els.cardCount.textContent = fmt.format(agg.cardCount);
  els.count30.textContent = fmt.format(agg.count30);
  els.count7.textContent = fmt.format(agg.count7);
  els.dedupeRate.textContent = `${fmt.format(agg.dedupeRate)}%`;
  els.updatedAt.textContent = rawData.updatedAt ? rawData.updatedAt.slice(0, 10) : "-";
  renderShopRail(shopSummaries);
  if (!sorted.length) {
    els.cards.innerHTML = `
      <div class="panel-in">
        <strong>該当なし</strong>
        <p class="muted" style="margin:8px 0 0">条件を少しゆるめると、集計結果が表示されます。</p>
      </div>
    `;
    return;
  }

  els.cards.innerHTML = sorted
    .map((item) => {
      return `
        <article class="card-row">
          <div class="thumb">
            <strong>${item.cardName}<br><span style="font-weight:700;color:rgba(255,255,255,.72)">${item.setLabel} ${item.cardNumber}</span></strong>
          </div>
          <div>
            <div class="title-row">
              <div>
                <p class="eyebrow" style="margin-bottom:6px">${item.shopName}</p>
                <h3>${item.cardName}</h3>
                <div class="badge-row">
                  <span class="chip info">7日 ${fmt.format(item.count7)}件</span>
                  <span class="chip info">30日 ${fmt.format(item.count30)}件</span>
                  <span class="chip">信頼度 ${(item.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
              <a class="xlink" href="${item.sourceUrl}" target="_blank" rel="noreferrer">Xで見る →</a>
            </div>
            <div class="price-line">
              <div class="price-box">
                <span>平均掲載価格</span>
                <strong>${yen.format(item.avgPrice)}</strong>
              </div>
              <div class="price-box">
                <span>中央値</span>
                <strong>${yen.format(item.medianPrice)}</strong>
              </div>
              <div class="price-box">
                <span>投稿数ベース</span>
                <strong>${fmt.format(item.count30)}件</strong>
              </div>
            </div>
            <div class="meta-grid" style="margin-top:10px">
              <div class="price-box">
                <span>最新投稿日</span>
                <strong>${item.lastSeenAt.slice(0, 10)}</strong>
              </div>
              <div class="price-box">
                <span>判別メモ</span>
                <strong>${item.imageLabel}</strong>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function syncFromControls() {
  state.query = els.query.value;
  state.shop = els.shopFilter.value;
  state.min7 = n(els.min7.value) ?? 0;
  state.min30 = n(els.min30.value) ?? 0;
  state.priceMin = n(els.priceMin.value);
  state.priceMax = n(els.priceMax.value);
  state.sort = els.sort.value;
}

async function loadData() {
  try {
    const injected = window.X_MONITOR_DATA;
    if (injected) {
      rawData = normalizeData(injected);
      rawRows = [...rawData.rows];
      return;
    }
    const res = await fetch("./data/monitor-data.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    rawData = normalizeData(data);
    if (Array.isArray(rawData.rows) && rawData.rows.length) {
      rawRows = rawData.rows;
    }
  } catch {
    rawData = cloneData(fallbackData);
    rawRows = [...fallbackData.rows];
  }
}

async function bootstrap() {
  await loadData();
  renderShopOptions();
  render();
}

for (const el of [els.query, els.shopFilter, els.min7, els.min30, els.priceMin, els.priceMax, els.sort]) {
  el.addEventListener("input", () => {
    syncFromControls();
    render();
  });
  el.addEventListener("change", () => {
    syncFromControls();
    render();
  });
}

bootstrap();
