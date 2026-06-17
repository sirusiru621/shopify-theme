# 粒単位の共通在庫管理

> **ステータス: 一時無効化（2026-06-17）**  
> テーマから `grain-inventory.js` および関連スニペットを削除済みです。将来の粒単位在庫開発時に本ドキュメントを参照して再実装してください。管理画面の metafield 定義・商品値は残置して問題ありません。

このテーマ側実装は、商品ページとカートで粒単位の在庫不足を判定し、注文データに減算用の private line item properties を付与します。

重要: テーマだけでは注文確定後に Shopify の在庫数を書き換えられません。実際の減算、二重減算防止、注文失敗時の非減算は、Shopify app / webhook / Flow などの管理 API 側で実装してください。

## 管理者が設定する metafield

商品またはバリエーションに以下を設定します。バリエーション側の値がある場合はバリエーション側を優先します。

| namespace.key | 対象 | 型 | 内容 |
| --- | --- | --- | --- |
| `custom.grain_inventory_group` | 商品/バリエーション | single line text | 共通在庫グループ名。例: `雪もち` |
| `custom.grain_units_per_item` | バリエーション | number_integer | 1点購入時に消費する粒数。例: 4, 9, 16 |
| `custom.grain_stock_delivery_handle` | 商品/バリエーション | single line text | 発送用の共通在庫商品ハンドル |
| `custom.grain_stock_pickup_handle` | 商品/バリエーション | single line text | 店頭受取用の共通在庫商品ハンドル |

後方互換として、旧 `custom.base_item_handle` がある場合は、発送/店頭受取の在庫ハンドルが未設定のときだけ共通在庫として参照します。

## 共通在庫商品の作り方

例:

- `雪もち 発送用 粒在庫` という商品を作り、ハンドルを `yukimochi-delivery-stock` にする
- `雪もち 店頭受取用 粒在庫` という商品を作り、ハンドルを `yukimochi-pickup-stock` にする
- それぞれの Shopify 標準在庫数を粒数で設定する
- 販売商品側の metafield に上記ハンドルを設定する

このテーマはその在庫商品の `selected_or_first_available_variant.inventory_quantity` を読み、購入前判定に使います。

## 注文に付与される private properties

商品がカートに入ると、以下の private line item properties が付きます。

| property | 内容 |
| --- | --- |
| `_grain_inventory_enabled` | 粒在庫対象かどうか |
| `_grain_inventory_group` | 共通在庫グループ名 |
| `_grain_stock_method` | `delivery` または `pickup` |
| `_grain_units_per_item` | 1点あたり消費粒数 |

バックエンド側では、注文 paid / orders/create などの確定イベントで、同じ `_grain_inventory_group` + `_grain_stock_method` を合算し、`_grain_units_per_item * quantity` を減算してください。二重減算防止には、処理済み注文 ID を保存してください。

## どら焼き拡張

白黒を別在庫で減らす場合は、通常の `grain_units_per_item` だけでは足りません。次のような JSON metafield を追加し、バックエンド側で解釈する設計に拡張してください。

```json
{
  "dorayaki_white": 3,
  "dorayaki_black": 3
}
```

現時点のテーマ実装は、まず単一グループの粒数在庫を対象にしています。
