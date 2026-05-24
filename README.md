# MCP: Document Checker

提出書類のチェックリスト管理サーバー。必要書類のリストとサンプルテンプレートを定義し、提出物がすべての記入項目を満たしているかを自動で検証します。

## 動作の流れ

```
検証者（管理者）側:
  create_checklist → add_item → add_sample（.docx/.xlsx のテンプレートを登録）
                              ↓ MCPが {{field_name}} プレースホルダーを自動抽出
                              → add_validation_rule（追加の確認ルールがあれば）

提出者側:
  [提出書類を用意]
  → validate_submission（MCPがファイルを読み、全プレースホルダーが埋まっているか自動判定）
  → submit_item（全チェックpassなら提出確定 ✅ / failならブロック ❌）
```

### サンプルファイルの規約
- 形式: **Word (.docx) または Excel (.xlsx) のみ**
- 記入必須箇所は `{{field_name}}` 形式で明示（例: `{{氏名}}`、`{{住所}}`、`{{発行日}}`）
- MCPが自動でプレースホルダーを抽出し、確認すべき項目リストとして登録する

## 使い方

| 機能 | 例 |
|---|---|
| チェックリスト作成 | 「入社手続きのチェックリストを作って」 |
| 書類追加 | 「住民票を必須書類として追加して」 |
| サンプル登録 | 「住民票確認のサンプルファイルを登録して」 |
| バリデーションルール追加 | 「マイナンバーがマスキングされているか確認するルールを追加して」 |
| 提出物の検証 | 「この住民票ファイルを検証して」 |
| 提出記録 | 「住民票を提出済みにして」 |
| 未提出一覧 | 「まだ提出されていない必須書類を教えて」 |
| 状況確認 | 「入社手続きチェックリストの状況を見せて」 |

## ツール一覧

### チェックリスト管理
| ツール | 引数 | 説明 |
|---|---|---|
| `create_checklist` | `name`, `description?` | チェックリストを作成 |
| `add_item` | `checklist_id`, `name`, `description?`, `required?` | 必要書類を追加 |
| `submit_item` | `checklist_id`, `item_id`, `note?`, `force_submit?` | 提出を記録（バリデーション未通過の場合はブロック） |
| `get_checklist` | `checklist_id` | チェックリスト全体の状況を取得 |
| `get_missing` | `checklist_id` | 未提出の必須書類一覧を取得 |
| `list_checklists` | — | 全チェックリストの一覧 |
| `delete_checklist` | `checklist_id` | チェックリストを削除 |

### サンプルテンプレート
| ツール | 引数 | 説明 |
|---|---|---|
| `add_sample` | `checklist_id`, `item_id`, `description`, `file_path` | .docx/.xlsx テンプレートを登録。`{{プレースホルダー}}` から必要項目を自動抽出 |
| `validate_submission` | `checklist_id`, `item_id`, `sample_id`, `submission_file_path` | 提出ファイルを読み込み、全プレースホルダーが埋まっているかMCPが自動判定 |
| `get_samples` | `checklist_id`, `item_id` | 書類に登録されたサンプル一覧を取得 |
| `delete_sample` | `checklist_id`, `item_id`, `sample_id` | サンプルを削除 |

### バリデーション
| ツール | 引数 | 説明 |
|---|---|---|
| `add_validation_rule` | `checklist_id`, `item_id`, `type`, `description` | 書類にバリデーションルールを追加 |
| `record_validation_result` | `checklist_id`, `item_id`, `rule_id`, `outcome`, `reason` | Claudeの確認結果を記録（`pass`/`fail`） |
| `get_validation_rules` | `checklist_id`, `item_id` | ルールと最新の検証結果を取得 |
| `delete_validation_rule` | `checklist_id`, `item_id`, `rule_id` | ルールを削除 |

### バリデーションルールの種類
| タイプ | 説明 |
|---|---|
| `file_uploaded` | ファイルが添付されているか |
| `no_masking_omission` | マイナンバー等のマスキング漏れがないか |
| `correct_document` | 正しい書類種別が提出されているか |
| `custom` | 自然言語で記述した任意の確認条件 |

## サンプルファイル

`samples/` ディレクトリにテンプレートファイルが用意されています：

| ファイル | 説明 | 項目数 |
|---|---|---|
| `samples/onboarding-form.xlsx` | 入社情報フォーム | 入社日・氏名・住所・口座情報など14項目 |
| `samples/residence-certificate-check.xlsx` | 住民票確認チェックリスト | 発行日・マイナンバーマスキング確認など8項目 |
| `samples/employment-contract-check.docx` | 雇用契約書確認フォーム | 会社名・労働条件・署名確認など13項目 |

すべてのテンプレートは `{{field_name}}` 形式のプレースホルダーで記入必須箇所を明示しています。`add_sample` に渡すと、MCPが自動でフィールドリストを抽出します。

## インストール

1. リポジトリをクローン:

```bash
git clone https://github.com/NexaScience/mcp-doc-checker
cd mcp-doc-checker
```

2. 依存関係をインストール:

```bash
npm install
```

3. ビルド:

```bash
npm run build
```

> MCPホストに追加する前に必ず実行してください。

## セットアップ

MCPホストの設定ファイルに追加します（[ホスト別の手順はこちら](https://modelcontextprotocol.io/quickstart/user)）：

```json
{
  "mcpServers": {
    "doc-checker": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-doc-checker/dist/server.js"]
    }
  }
}
```

保存後、ホストを再起動してください。

## プロジェクト構成

```
src/
├── server.ts               # エントリーポイント
├── core/
│   ├── constants.ts        # ツールスキーマ・定数
│   └── message-handler.ts  # MCPメッセージハンドリング
├── handlers/
│   └── tool-handler.ts     # ツールハンドラー（16ツール）
├── services/
│   └── checklist-service.ts  # ビジネスロジック
├── types/
│   ├── mcp.ts              # MCP基盤型定義
│   └── checklist.ts        # Checklist / ValidationRule / ItemSample 型定義
└── utils/
    ├── logger.ts           # ロギング
    ├── validator.ts        # バリデーション
    └── doc-parser.ts       # Word/Excel テキスト抽出・プレースホルダー検出
tests/
└── checklist.test.ts       # ユニット・統合テスト（67件）
```

## 開発

- `npm run dev` - 開発モードで起動
- `npm run build` - TypeScript をビルド
- `npm run watch` - 変更を監視しながらビルド
- `npm test` - テストを実行
