# あいサポ ソース構成（Ver.2.8.62）

## 本番ファイル

- `index.html` — 画面構造・モーダル
- `assets/css/styles.css` — UIスタイル
- `assets/js/config.js` — 定数・ステータス設定
- `assets/js/state.js` — クライアント状態
- `assets/js/utils.js` — 共通UIヘルパー
- `assets/js/api.js` — GAS API通信
- `assets/js/auth.js` — ログイン・3時間無操作ログアウト・パスワード
- `assets/js/map.js` — 地図・マーカー・現在地
- `assets/js/records.js` — 訪問先詳細・訪問履歴・位置編集
- `assets/js/contacts.js` — 名簿・名簿取込・位置未確認処理
- `assets/js/views.js` — 一覧・活動状況・支部連絡
- `assets/js/admin.js` — ユーザー・エリア管理
- `assets/js/main.js` — 起動・レスポンシブ補助
- `gas/Code.gs` — Apps Script API本番コード

## スプレッドシート

本番で使用するのは次の9シートのみです。

`Users / Branches / Areas / Contacts / Records / VisitHistory / Sessions / BranchMessages / LoginHistory`

## 保守ルール

1. 一時的な移行・調査・クリーンアップ関数は本番 `Code.gs` に残さない。
2. データ移行が必要な場合は別の一時 `.gs` として実行し、完了後に削除する。
3. 名簿由来データは住所文字列を保存せず、党員ID・苗字・位置情報を基本とする。
4. バージョン更新時は `index.html` の表示とキャッシュバスター、`doGet()` のAPI名を同時に更新する。
5. 本番ZIPにはテストデータ・旧バックアップ・移行スクリプトを含めない。


## Ver.2.8.62 analytics
- GAS `activitySummary` は VisitHistory をエリア単位で集計し、個々の履歴を一括返却しません。
- 地域進捗はブラウザ側で Records の緯度経度を約500m区画に集約します。住所文字列は不要です。
- `urgent` は手動の急ぎフラグです。通常の再訪順は `nextVisitDate` を基準にします。
