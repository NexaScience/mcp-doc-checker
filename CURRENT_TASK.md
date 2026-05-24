task_id: mcp-doc-checker-v2
system_type: content_gen
summary: "書類アイテムにバリデーションルール管理と提出前チェック機能を追加する"

goal: >
  入社手続き・契約締結・申請手続きなど汎用的なユースケースに対応できる
  「チェックリスト＋書類アイテム」の二層構造を持つMCPサーバーを、
  MCP-todoサーバーのTypeScript/Node.js構造を流用して実装する。

success_criteria:
  - MCPサーバーがstdio JSON-RPC 2.0で起動し、initializeリクエストに正常応答する
  - 7つのツールがtools/listに列挙される
  - create_checklist → add_item → submit_item → get_missingの一連フローが正常動作する
  - 存在しないIDへの操作でMCP_ERRORS.VALIDATION_ERROR(-32006)が返る
  - required=falseのアイテムはget_missingに含まれない
  - npm run buildが成功しdist/server.jsが生成される

allowed_paths:
  - /Users/kumacmini/Library/CloudStorage/Dropbox/mcp-servers/mcp-doc-checker/

out_of_scope:
  - データの永続化
  - 認証・認可
  - MCP Resources（tools のみ）
  - Web UI / REST API
