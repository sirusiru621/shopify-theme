# 粒単位の共通在庫管理

> **ステータス: 再有効化（2026-07-07）**  
> テーマに `grain-inventory.js` および関連スニペットを再実装しました。在庫減算は `sisiri-stock-app` が webhook で処理します。

このテーマ側実装は、商品ページとカートで粒単位の在庫不足を判定し、注文データに減算用の private line item properties を付与します。

重要: テーマだけでは注文確定後に Shopify の在庫数を書き換えられません。実際の減算、二重減算防止、注文失敗時の非減算は、Shopify app / webhook / Flow などの管理 API 側で実装してください。

## 管理者が設定する metafield

商品またはバリエーションに以下を設定します。バリエーション側の値がある場合はバリエーション側を優先します。

| namespace.key | 対象 | 型 | 内容 |
| --- | --- | --- | --- |
| `custom.grain_inventory_group` | 商品/バリエーション | single line text | 共通在庫グループ名。例: `雪もち` |
| `custom.grain_units_per_item` | バリエーション | number_integer | 1点購入時に消費する粒数。例: 4, 9, 16 |
| `custom.grain_inventory_components` | 商品/バリエーション | json | 部品別の1点あたり消費数。例: `{"dorayaki_black":3,"dorayaki_white":3}` |
| `custom.grain_stock_delivery_handle` | 商品/バリエーション | single line text | 旧配送共通在庫の商品ハンドル（発送枠情報がない旧注文との後方互換用） |
| `custom.grain_stock_pickup_handle` | 商品/バリエーション | single line text | 店頭受取用の共通在庫商品ハンドル（受取日別管理を行わない商品用） |

後方互換として、旧 `custom.base_item_handle` がある場合は、発送/店頭受取の在庫ハンドルが未設定のときだけ共通在庫として参照します。

## 旧形式の店頭共通在庫

受取枠情報がない既存注文との後方互換用として、旧店頭共通在庫の設定は残しています。新しい対象商品では受取日別在庫を使うため、新規設定は不要です。旧設定例:

- `雪もち 店頭受取用 粒在庫` という商品を作り、ハンドルを `yukimochi-pickup-stock` にする
- Shopify 標準在庫数を粒数で設定する
- 販売商品側の metafield に上記ハンドルを設定する

配送分はShopify共通在庫ではなく、`sisiri-stock-app` の発送枠DBで発送日別に管理します。雪もち・どら焼き・流氷羹・雪景糖の店頭受取も共通在庫を使わず、アプリDBで受取日別に管理します。

## 注文に付与される private properties

商品がカートに入ると、以下の private line item properties が付きます。

| property | 内容 |
| --- | --- |
| `_grain_inventory_enabled` | 粒在庫対象かどうか |
| `_grain_inventory_group` | 共通在庫グループ名 |
| `_grain_stock_method` | `delivery` または `pickup` |
| `_grain_units_per_item` | 1点あたり消費粒数 |
| `_grain_component_units` | 黒・白など部品別の1点あたり消費数（JSON） |
| `_grain_shipping_slot_id` | 配送商品の発送枠ID |
| `_grain_shipping_date` | 発送日（`YYYY-MM-DD`） |
| `_grain_delivery_date` | お届け希望日（`YYYY-MM-DD`） |
| `_grain_pickup_slot_id` | 店舗受取商品の受取枠ID |
| `_grain_pickup_date` | 受取日（`YYYY-MM-DD`） |

アプリは配送注文を `_grain_shipping_slot_id` ごとに、店頭注文を `_grain_pickup_slot_id` ごとに減算します。黒・白などの内訳がある商品は、選択された枠の該当内訳だけを減算します。キャンセル時は同じ枠・同じ内訳へ戻し、処理済み注文IDで二重処理を防ぎます。枠情報がない旧形式の注文だけは、後方互換として旧共通在庫を使用します。

## 全対象商品の店舗受取日別在庫

雪もち・どら焼き・流氷羹・雪景糖で店舗受取を選ぶと、テーマはApp Proxyの `/apps/mochi/pickup-slots` から商品グループ別の販売中受取枠を取得します。標準では金・土・日が対象で、前日の9:00に直近の受取日を閉じ、同時に翌週の同曜日を公開します。

商品をカートへ入れる前とカート表示時に、選択した受取枠が販売中か、必要な粒数または内訳別個数が残っているかを再検証します。受取日未選択、締切済み、在庫不足、または異なる受取日の混在時は購入できません。同じ受取日の別商品は一緒に購入できます。

商品ページやお届け日カードには、残り粒数・残り個数を表示しません。在庫判定は画面に数値を出さずに実行し、不足時だけ購入不可の案内を表示します。具体的な在庫数はアプリ管理画面でのみ確認します。

## どら焼きの黒・白在庫

どら焼きは `grain_inventory_components` を使い、黒・白を別在庫として判定・減算します。ミックス6個入りの例:

```json
{
  "dorayaki_black": 3,
  "dorayaki_white": 3
}
```

アプリはカート内の必要数を部品別に合算します。黒または白のどちらかが不足するとミックスも購入不可になり、注文確定時に両方を同時に減算、キャンセル時に両方を復元します。現在のどら焼き6商品は、メタフィールドが未設定でも商品ハンドルから既定の配合を読み取ります。メタフィールドを設定した場合はその値を優先します。

## 流氷羹の共通在庫

流氷羹の木箱入り（`ryuhyo-kan-kibako`）と紙箱入り（`ryuhyo-kan-kamibako`）は、同じ部品在庫を共有します。どちらも商品1点につき次の配合を使用します。

```json
{
  "ryuhyokan_item": 1
}
```

テーマは2商品のメタフィールドが未設定でも、商品ハンドルからこの既定配合と「流氷羹」グループを読み取ります。カート内では木箱・紙箱の必要数を合算し、注文確定時に共通在庫から減算、キャンセル時に復元します。

## 雪景糖の商品別在庫

雪景糖は、小（`sekketo-small`）と大（`sekketo-large`）で別々の部品在庫を使用します。

小:

```json
{ "sekketo_small": 1 }
```

大:

```json
{ "sekketo_large": 1 }
```

テーマはメタフィールドが未設定でも商品ハンドルから「雪景糖」グループと対応する既定配合を読み取ります。注文確定時は購入した商品側の在庫だけを減算し、キャンセル時に同じ商品在庫へ復元します。
