# データ形式

`monitor-data.json` は監視サイトが読む正式な入力です。

## 形式

```json
{
  "updatedAt": "2026-08-18T21:00:00+09:00",
  "source": {
    "kind": "manual|x|ocr|demo",
    "accountHandles": ["@Mist_nagoyaosu"]
  },
  "shops": [
    {
      "shopId": "mist",
      "shopName": "カードショップMist 名古屋大須店",
      "handle": "@Mist_nagoyaosu",
      "profileUrl": "https://x.com/Mist_nagoyaosu",
      "active": true
    }
  ],
  "rows": [
    {
      "shopId": "mist",
      "shopName": "カードショップMist 名古屋大須店",
      "handle": "@Mist_nagoyaosu",
      "postId": "...",
      "postedAt": "2026-08-18T05:00:00+09:00",
      "title": "投稿本文",
      "cardName": "カード名",
      "cardNumber": "349/190",
      "setLabel": "SV4a",
      "price": 98000,
      "confidence": 0.96,
      "sourceUrl": "https://x.com/...",
      "imageUrl": "画像URL",
      "imageLabel": "掲載画像 1",
      "dedupeKey": "重複排除キー"
    }
  ]
}
```

## 使い方

- 収集スクリプトはこの JSON を上書きする
- 画面は `rows` を読むだけにする
- 店舗を増やすときは `shopId` を追加する
- 重複排除は `dedupeKey` を基準にする
- `shops` は検索欄と店舗カードの元になる
