# Mist アカウントの次ステップ

このサイトは `@Mist_nagoyaosu` を最初の対象として進める。

## 最初にやること

1. 1件目のX投稿を capture template に入れる
2. `node work/build_mist_capture_rows.js` を実行する
3. `work/x-monitor-source.json` を更新する
4. `node work/update_x_monitor_site.js` を実行する
5. サイトでカード画像と元ページを確認する

## 手動で入れるもの

- 投稿URL
- 投稿日時
- 本文
- 画像URL
- カード名
- 価格
- 画像の切り出し位置

## 後で自動化するもの

- Xの新着取得
- 画像内の1枚ずつ切り出し
- OCR
- toreca-souba のカード照合

