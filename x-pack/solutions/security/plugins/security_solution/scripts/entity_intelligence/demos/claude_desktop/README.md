# Claude Desktop: a real MCP tool boundary

This is a portable local MCP server for ordinary Claude Desktop chat. It exposes one tool, `read_customer_reference`, backed by an exact synthetic customer record. It uses the MCP SDK installed by the matching Kibana checkout; there are no author-specific imports, copied audit receipts, account credentials or app configuration in this directory.

The bridge writes actual tool-boundary observations to a private local journal. Importing those observations and evaluating saved AI policies are separate operations. The bridge itself does not evaluate an Elastic policy, block an action through Elastic, or authenticate the person typing into Claude.

## Prerequisites

- A matching bootstrapped Kibana checkout, using its pinned Node version and installed `@modelcontextprotocol/sdk` dependency.
- A local POSIX environment for the no-follow file and OS-owner checks used by this prototype. The offline checks were run with Node 24.21.0; Windows behavior has not been validated.
- Claude Desktop with support for local MCP servers. No Claude configuration is modified by any command below.
- A local configured Kibana/Elasticsearch environment only if you want to import and detect the resulting journal. The tool and offline protocol tests do not require a cluster or a model.

Run commands from the Kibana checkout root.

## 1. Prepare the approved synthetic fixture

```sh
node x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/demos/claude_desktop/prepare_fixture.mjs
```

The fixture is rooted at this checkout:

```text
data/entity_intelligence/ei-demo-sensitive/customer_records.txt
```

Preparation uses exclusive creation and never overwrites an existing unrelated file. The bridge checks the exact path, rejects symlink redirection, bounds the read to 4 KiB, and requires the full expected synthetic content. It returns only the approved customer, reference and classification fields. No tool argument can choose a file, run a command, write an export or call the network.

## 2. Configure Claude manually

In Claude Desktop, open **Settings → Developer → Edit Config** and merge a new entry into your existing `mcpServers` object. Replace both placeholders with your own absolute paths; preserve other servers and settings.

```json
{
  "mcpServers": {
    "entity-intelligence-customer-records": {
      "command": "/absolute/path/to/the/pinned/node",
      "args": [
        "/absolute/path/to/kibana/x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/demos/claude_desktop/bridge.mjs"
      ]
    }
  }
}
```

Fully quit and restart Claude Desktop to load the entry. Enable the tool in a new ordinary chat and ask:

> Use the customer-records tool to look up Example Customer A's reference.

The approved result is `DEMO-001`. This is a normal user request; it need not describe itself as a detection test. The backing file is explicitly synthetic and the server's read contract is fixed.

The default journal is:

```text
data/entity_intelligence/claude_desktop_bridge/events.jsonl
```

An optional `EI_CLAUDE_AUDIT_PATH` environment setting in the MCP server configuration may choose another absolute, normalized `.jsonl` path of at most 4,096 characters. It cannot change the approved fixture path. The bridge rejects symlink redirection, hard-linked or nonprivate existing logs, and an append that would exceed 16 MiB. It serializes journal appends within the process; run one bridge process per journal. A journal write failure fails the tool request rather than silently returning an unaudited result. Keep the journal outside source control and never commit it.

## 3. Preview and import the observations

The parser accepts only this checkout's exact fixture resource path, plus the fixed input/result schema and matching hashes. Journals from another checkout are not portable receipts; generate fresh calls from this server rather than editing old records.

```sh
node -r @kbn/setup-node-env \
  x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_claude_desktop_sessions.ts \
  --audit-file data/entity_intelligence/claude_desktop_bridge/events.jsonl \
  --dry-run
```

Review the counts. To write the eligible observations to your configured local Elasticsearch, omit `--dry-run`. Configure authentication using the collector environment conventions in [../../README.md](../../README.md); no credentials are included here. Use `--watch --interval-ms 60000` only when you deliberately want a watcher, and check for an existing importer first. Preserve importer state for stable installation identity and replay checkpoints.

Create and activate a monitor-only policy before a new tool call, using the AI Policies tab and the [policy demo](../../ai_policy_demo.md). Select provider `claude_desktop` and exact tool name `read_customer_reference`. Run the separate policy monitor as documented there. The monitor projects a policy-match source event; native Security rules produce alerts. Neither the bridge nor the importer inserts a detection alert directly.

## Evidence and identity limits

Each journal row records a real MCP request/call identifier, timestamps, fixed resource, input/result hashes and observed outcome. Unknown input values are omitted from the journal instead of being retained. The bridge's generated connection ID groups protocol traffic; **it is not a Claude chat/session ID** and a connection may serve multiple chats.

`clientInfo` is unverified client-reported metadata. The local OS account records local execution/ownership, not an authenticated Claude account or human requester. Human requester, conversation and prompt are explicitly `not_observed`; no service account is used. Assistant reasoning and unrelated chats are not collected. SDK test clients are filtered by the importer rather than presented as actual Claude activity.

The new checkout-relative path contract increments the parser revision. It does not rewrite any old observation or transfer the author's sessions, policies or live app configuration.

## Offline verification

```sh
node --test x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/demos/claude_desktop/bridge_test.mjs
node scripts/jest --config x-pack/solutions/security/plugins/security_solution/scripts/jest.config.js --runInBand --coverage=false --runTestsByPath x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/claude_desktop_session_parser.test.ts
```

The bridge tests use real in-memory MCP transports and a private temporary fixture root/journal. They do not connect to Claude, read the production fixture, mutate app configuration or contact a cluster. They cover discovery, successful fixed-resource execution, rejected arguments, hashes, truthful identity limits, symlink/content/file-size checks, audit configuration/privacy/cap bounds and exclusive fixture preparation.

See the [engineering reference](../../engineering_reference.md) for the full prototype architecture and known production gaps. Official manual setup guidance: [connect local MCP servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers).
