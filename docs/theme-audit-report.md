# テーマ監査・外部連携整理レポート

実施日: 2026-06-17  
ベース: Dawn 10.0.0  
方針: 見た目・UI維持、独自アプリ依存ロジック削除、粒在庫は一時無効化（将来再開発予定）

---

## 分類サマリー

| 分類 | 件数（概算） | 対応 |
|------|-------------|------|
| Shopify標準（維持） | Dawnコア + Ajax API + のし + クロスセル | 変更なし |
| 稼働中カスタム | grain-inventory, inventory_options, 予約系 | 粒在庫削除・他はUI維持で簡素化 |
| 休眠コード | 20ファイル超 | Phase 1 で削除 |
| 管理画面要確認 | アプリ・metafield・チェックアウト | Phase 7 チェックリスト参照 |

---

## Phase 0: 調査結果（実施前の状態）

詳細は計画書 `テーマ外部連携整理` を参照。主要な独自連携:

- **粒在庫**: 全ページ `grain-inventory.js`、webhook/app 減算必須
- **App Proxy（休眠）**: `/apps/mochi/check` in `wagashi-bundle-manager.js`
- **在庫連動配送**: `main-product` `inventory_options` インラインJS
- **予約**: `weekend_reservation` + `product-reservation` 二系統

---

## Phase 1: 休眠アセット削除

### 削除ファイル

| ファイル | 削除理由 |
|---------|---------|
| `assets/wagashi-bundle-manager.js` | App Proxy `/apps/mochi/check`、Liquid未参照 |
| `assets/ross-sell-popup.js` | `cross-sell-popup.js` の重複コピー |
| `assets/checkout-fix.js` | Liquid未参照 |
| `assets/order-note-fix.js` | Liquid未参照 |
| `assets/inventory-delivery-options.js` / `.css` | ロジックは main-product インラインに内包、未参照 |
| `assets/inventory-options.js` | 同上 |
| `assets/bundle-products.js` | Liquid未参照 |
| `assets/enhanced-cart.js` | `cart.json` 未使用 |
| `assets/reservation-picker.js` / `.css` | Liquid未参照 |
| `assets/product-reservation-simple.js` | Liquid未参照 |
| `assets/gift-settings*.js` / `.css`（4組） | 未render、schema未実装 |
| `assets/cart-gift.js` / `.css` | 未render |
| `snippets/cart-gift-modal.liquid` | 未render |
| `snippets/gift-settings-cart-integration.liquid` | 未render |
| `sections/enhanced-cart-items.liquid` | `cart.json` 未使用 |
| `sections/upsell-popup-section.liquid` + JS/CSS | テンプレート未使用 |
| `templates/collection..json` | 異常な空ハンドル名 |
| `templates/product..json` | 同上 |

### 影響範囲

稼働中ページへの影響なし（いずれも未配線）。

### テスト結果

静的削除のため、テーマファイル参照整合性のみ確認。

---

## Phase 2: 粒在庫（grain-inventory）無効化

### 変更内容

| ファイル | 変更 |
|---------|------|
| `layout/theme.liquid` | `grain-inventory.js` 読込削除 |
| `sections/main-product.liquid` | `grain-inventory-product` render 削除 |
| `snippets/cart-drawer.liquid` | `grain-inventory-cart` render 削除 |
| `sections/main-cart-footer.liquid` | 同上 |
| `assets/product-form.js` | `GrainInventory.validateProductForm` 削除 |
| `snippets/buy-buttons.liquid` | 粒在庫による dynamic checkout 無効化を削除 |
| `assets/grain-inventory.js` | ファイル削除 |
| `snippets/grain-inventory-product.liquid` | ファイル削除 |
| `snippets/grain-inventory-cart.liquid` | ファイル削除 |
| `docs/grain-inventory.md` | 一時無効化の注記を追加 |

### 削除理由

注文確定後の在庫減算に app/webhook が必須。ユーザー方針により一時削除。管理画面の metafield 定義・値は将来再開発用に残置可。

### 影響範囲

粒在庫対象商品の checkout ゲート解除、Shop Pay 等 dynamic checkout 復活、line item properties `_grain_*` の付与停止。

### 未確認項目

- 本番ストアで粒在庫 metafield が設定された商品の購入フロー実機確認
- 外部アプリが `_grain_*` properties を参照している場合の注文処理

---

## Phase 3: inventory_options 簡素化

### 変更内容

`main-product.liquid` の `inventory_options` インラインJSに `DISABLE_BACKEND_INVENTORY_LOGIC` フラグを追加。在庫切れ・CLOSE枠による選択不可を無効化。日時UIと line item properties 送信は維持。

### 削除理由

枠割当・在庫同期はアプリ/手動運用前提。フロントのみでは正確な在庫制御不可。

### 影響範囲

約21商品テンプレートの配送/受取日時UI（見た目維持、全日程選択可能化）。

---

## Phase 4: 予約系簡素化

### 変更内容

- `assets/weekend-reservation.js`: 枠数・完売判定を無効化
- `sections/main-product.liquid` `weekend_reservation`: 受付停止（金10時〜土10時）を無効化
- `sections/product-reservation.liquid`: metafield `reservation_data` をJSに渡さない（空オブジェクト）

### 削除理由

`reservation_bookings` / `reservation_data` の更新はバックエンド必須。UIのみ維持。

### 影響範囲

`templates/product.reservation.json`

---

## Phase 5: 壊れた参照・怪しいコード整理

### 変更内容

| 項目 | 対応 |
|------|------|
| `sections/order-confirmation-form.liquid` | セクション削除（disabled・欠落JS・csrf metafield） |
| `templates/index.json` | order-confirmation-form セクション削除、予約バナーURL修正 |
| `sections/custom-faq-section.liquid` | 存在しない `section-japanese-faq.css` 参照削除 |

### 削除理由

`premium-order-form.js` 不存在、`shop.metafields.security.csrf_token` は外部POST想定、セクションは disabled。

---

## Phase 6: テンプレート整合性

### 変更内容

- `templates/product.custom-options.json` から未実装 `gift_settings_simple` ブロック削除

---

## Phase 7: Shopify管理画面確認チェックリスト

コード変更外。以下を管理画面で確認してください。

### アプリ

- [ ] 設定 → アプリ: 在庫・予約・配送系のインストール済みアプリ一覧
- [ ] `sisiri-stock-app`（App Proxy `/apps/mochi/check`）が稼働中か
- [ ] テーマエディタ → アプリ embed / `content_for_header` 注入スクリプト

### Metafield

- [ ] 設定 → カスタムデータ: `grain_inventory_*`, `reservation_*` 定義の有無
- [ ] 商品ごとの metafield 値（削除後もデータ残存は問題なし）

### チェックアウト

- [ ] 設定 → チェックアウト: カスタムアプリ・Shopify Functions
- [ ] 配送・受取に関するチェックアウト UI 拡張

### 計測

- [ ] 顧客イベント / GA4: `floating-reservation-banner` の gtag イベント
- [ ] `collection-header-section` の `analytics.track` 要否

### テーマ

- [ ] 開発テーマへ push 後、代表商品・カート・checkout の実機確認
- [ ] `product.reservation` テンプレ商品の予約UI

---

## 作業レポート追記テンプレート

各 Phase 完了時に以下を追記:

```
### Phase N 完了 (YYYY-MM-DD)
- 変更ファイル: ...
- 削除理由: ...
- 影響範囲: ...
- テスト結果: ...
- 未確認項目: ...
```

---

## 実施完了ログ（2026-06-17）

### Phase 1 完了
- 休眠アセット 30ファイル超を削除
- テスト結果: コード内参照なしを grep で確認

### Phase 2 完了
- 粒在庫全体系を削除・参照除去
- テスト結果: `grain-inventory` 参照は docs のみ
- 未確認項目: 粒在庫 metafield 設定商品の実機購入フロー

### Phase 3 完了
- `DISABLE_BACKEND_INVENTORY_LOGIC = true` を inventory_options JS に追加
- 未確認項目: 21商品テンプレでの日時選択→カート追加

### Phase 4 完了
- weekend_reservation: 受付停止・metafield枠制限を無効化
- product-reservation: reservationData を空オブジェクトに固定
- 未確認項目: `product.reservation` テンプレの予約UI

### Phase 5 完了
- `order-confirmation-form` セクション削除、`index.json` 整理
- 予約バナー CTA を `/collections/workshop` に修正
- `section-japanese-faq.css` 欠落参照を削除

### Phase 6 完了
- `product.custom-options.json` から未実装 `gift_settings_simple` ブロック削除

### Phase 7（管理画面確認・要手動実施）
上記「Phase 7: Shopify管理画面確認チェックリスト」の各項目を、開発テーマ反映後に管理画面で確認してください。

### richtext バリデーション修正（2026-06-17）

- `templates/product.json`, `product.custom-options.json`, `product.kamibukuro.json`, `product.sakka-product.json`, `product.ws.json` の `text` ブロック（richtext）でプレーンテキストを `<p>` ラップ
- `templates/product.json` 追補: `vendor` ブロックは richtext に Liquid（`{{ product.vendor }}`）を入れるとバリデーション失敗するため `custom_liquid` ブロックへ変更。rich-text セクションの `text` も `<p>` タグに統一
- `shopify theme check` で当該5ファイルに関するエラーは未検出（全体は locales 翻訳不足等の既存エラーで exit 1）
