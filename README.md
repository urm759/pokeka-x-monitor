# 買取屋とりまとめサイト

これは、Xの買取表を店舗別に集計し、みんなのトレカ相場のカード一覧と照合しながら見るための静的サイトです。

## できること

- 1店舗から始める前提の画面
- 7日 / 30日掲載回数の集計
- 店舗名・カード名・型番で検索
- 価格帯フィルタ
- X の元投稿へ直接移動
- 重複投稿を除外する設計
- 店舗ごとの集計と合計集計
- toreca カード画像との照合

## まだ仮のもの

- 実際の X 収集
- OCR
- 自動スケジューラ
- 画像の長期保存

## 更新フロー

1. 収集スクリプトが `work/x-monitor-source.json` を作る
2. `node work/update_x_monitor_site.js` を実行する
3. `outputs/x-monitor-prototype/data/monitor-data.json` と `monitor-data.js` が更新される
4. サイトはその JSON を読むだけで表示される

`work/x-monitor-source.json` が空なら、`work/x-monitor-source.sample.json` を見本として使います。
まずは sample を `x-monitor-source.json` にコピーして、`posts[].listings[]` を埋めるのが一番楽です。

## 入力データの形

最低限、`rows` か `posts` のどちらかがあれば動きます。

各行でよく使う項目:

- `shopId`
- `shopName`
- `handle`
- `postId`
- `postedAt`
- `title`
- `cardName`
- `cardNumber`
- `setLabel`
- `price`
- `sourceUrl`
- `postUrl`
- `imageUrl`
- `imageLabel`
- `torecaId`
- `torecaUrl`
- `confidence`
- `dedupeKey`

`posts` 形式なら、1投稿ごとに `listings` を持たせると複数枚をまとめて扱えます。

## 容量の考え方

- 長く保存するのはメタデータ中心
- 画像は短期キャッシュかサムネイルだけ
- 店舗が増えたら shop ごとにデータを分割
