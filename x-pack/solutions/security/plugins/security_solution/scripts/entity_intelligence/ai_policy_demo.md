# Managed AI policies: native detection demo

Create a policy in Entity Intelligence, perform an actual tool action in Cursor and Agent Builder, and investigate the resulting Elastic detection alerts. The monitor observes calls after they occur; it does not intercept or block actions. The operations really execute against deliberately synthetic fixtures. This flow needs no gateway command, generated agent event, or manually inserted alert.

## Local prerequisites

Run from the Kibana repository root using the Node version in `.nvmrc`, with the local prototype's Elasticsearch and Kibana running. Use the same space in the UI and both collector commands. Populate these environment variables in each collector terminal; angle-bracket values are placeholders, not working credentials:

```sh
export ES_URL='http://127.0.0.1:9200'
export KIBANA_URL='http://127.0.0.1:5601'
export ES_USERNAME='<local-elasticsearch-user>'
export ES_PASSWORD='<local-elasticsearch-password>'
export KIBANA_USERNAME='<user-running-the-Agent-Builder-demo>'
export KIBANA_PASSWORD='<that-users-kibana-password>'
export EI_DEMO_SPACE='default'
```

Keep actual credentials out of repository files. Existing, appropriately authorized `ES_API_KEY` or `KIBANA_API_KEY` credentials can replace the corresponding username/password. Elasticsearch collector and Kibana credentials can be different. The policy monitor accepts only loopback HTTP(S) URLs without embedded credentials.

Private conversation access compares stable user identities. A collector using stateless Basic authentication can receive 404 even with the same username shown in the browser: browser authentication supplies a profile UID, while Basic authentication can supply a different realm-based ID. This does not stop detection. The immutable event keeps the recorded actor hash, and the session graph can resolve the real name through the signed-in browser's authorized access to the exact conversation round. A hash in the stored finding and a resolved name in the graph therefore reflect different available evidence. Do not weaken conversation access, create replacement credentials, or substitute the conversation owner/current viewer to recover a name.

The target space's Agent Builder setup must have these tracing settings enabled: `agentBuilder:tracing:enabled`, `agentBuilder:tracing:includeToolDetails`, `agentBuilder:tracing:includeRealNames`, and `agentBuilder:tracing:includeRealIds`. They provide native spans, recorded tool inputs, actual tool names, and direct conversation references. `agentBuilder:tracing:includeUserData` can remain disabled: a recorded actor hash can be resolved through matching accessible conversation-round author evidence. The monitor does not change tracing settings or require system prompts, model responses, or reasoning capture.

### Permissions

These are prototype access requirements, not a production least-privilege role definition:

- Policy reads require Security Solution and Entity Analytics read access; create/edit and heartbeat writes require Entity Analytics management. The API uses the requesting user's Elasticsearch client. That user also needs `read` and metadata access on `.entity-intelligence-ai-policies-<space>`, plus `write` and `create_index` for editing/setup. Kibana feature access alone does not grant these index rights.
- Collector Elasticsearch credentials need read and metadata access on the exact native observation indices: `logs-cursor.entity_intelligence-<space>`, `traces-agent_builder.otel-<space>`, and optional `logs-codex.entity_intelligence-<space>`. Setup also needs `manage_index_templates` and index management rights to create/update mappings, plus creation/write/refresh access on the Cursor and security destination indices.
- Collector Kibana credentials need policy read/management, Agent Builder inventory/conversation access, and permission to create/update and schedule detection rules. The rule execution identity must be able to read `logs-entity_intelligence.security-<space>`. The collector never writes alert indices directly.
- The interactive Agent Builder user needs access to the chosen agent, its ES|QL tools, and the fixture index. Investigators need access to the corresponding alerts and native/source evidence. Matching a policy does not grant resource access.

## 1. Prepare safe fixtures

The existing local demo already has both fixtures. Skip setup when they exist. For a fresh setup, create the file without overwriting an existing file:

```sh
node --input-type=module <<'NODE'
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = resolve('data/entity_intelligence/ei-demo-sensitive');
const file = resolve(directory, 'customer_records.txt');
await mkdir(directory, { recursive: true });
try {
  await writeFile(file, [
    'Entity Intelligence demonstration fixture — synthetic records only.',
    'classification: confidential-demo',
    'customer: Example Customer A',
    'reference: DEMO-001',
    'This file contains no credentials or real customer data.',
    '',
  ].join('\n'), { flag: 'wx' });
  console.log(`Created ${file}`);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log(`Already exists; left unchanged: ${file}`);
}
NODE
```

Create the isolated Elasticsearch fixture in local Kibana Dev Tools. If the index/document already exists, inspect or reuse it; these create operations intentionally do not overwrite it.

```http
PUT ei-demo-sensitive-records
{
  "mappings": {
    "properties": {
      "customer": { "type": "keyword" },
      "reference": { "type": "keyword" },
      "classification": { "type": "keyword" },
      "note": { "type": "text" }
    }
  }
}

PUT ei-demo-sensitive-records/_create/demo-001?refresh=wait_for
{
  "customer": "Example Customer A",
  "reference": "DEMO-001",
  "classification": "confidential-demo",
  "note": "Synthetic policy-monitoring fixture; no real customer data or credentials."
}
```

## 2. Create the policy before the action

Open **Entity Intelligence → AI policies → Create policy**:

| Field               | Initial example                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Policy name         | Restricted customer records                                                                                                    |
| Description         | Detect agent tool inputs referencing the synthetic customer fixture.                                                           |
| Agent sources       | Cursor and Agent Builder                                                                                                       |
| Tool name is one of | Empty, initially allowing any tool name.                                                                                       |
| Tool input contains | `ei-demo-sensitive`                                                                                                            |
| Finding category    | Protected file access, or Restricted tool use for a general tool-usage policy. This classification does not prove file access. |
| Severity            | High                                                                                                                           |
| Enabled             | Yes                                                                                                                            |
| Mode                | Monitor / detection only                                                                                                       |

Use an ordinary user request; no test declaration or special prompt phrase is required. The conditions apply to recorded **tool calls**, not merely a chat prompt. The marker occurs in both the file path and index name. With the broad initial policy, ES|QL execution and a preliminary index-mapping lookup can both match.

The editor's match preview checks the supplied sample only; it does not execute a tool, import evidence, or create an alert. Save the policy and note its revision/effective time, then perform a fresh action. Earlier calls are not retroactively matched to a new revision.

## 3. Run the collectors

Check for existing `import_cursor_sessions.ts` and `ai_policy_monitor.ts` processes before starting another. Keep one of each, preserving the existing importer state file so installation IDs and salts remain stable. An existing Cursor watcher may use its default 60-second interval.

In one terminal, run the Cursor importer. Use 60-second polling to keep laptop resource use down:

```sh
node -r @kbn/setup-node-env \
  x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_cursor_sessions.ts \
  --space-id "$EI_DEMO_SPACE" --watch --interval-ms 60000
```

It reads `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` through a read-only connection; `--state-db` overrides the actual source path. It writes redacted observations to `logs-cursor.entity_intelligence-<space>` without changing Cursor configuration or its database.

In another terminal, run the policy monitor:

```sh
node -r @kbn/setup-node-env \
  x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/ai_policy_monitor.ts \
  --space-id "$EI_DEMO_SPACE" --watch --interval-seconds 60
```

Replace `--watch` with `--once` for one pass. The monitor fetches saved policies, evaluates native observations, creates immutable source matches, installs four severity-specific query rules, and requests rule execution. Its heartbeat's `findingsCreated` means newly published **source matches**; verify an actual detection alert before claiming end-to-end success.

Ctrl-C stops a collector. These are foreground processes, not persistent system services. Restart after code changes. The monitor retries transient failures after startup and reports degraded/stale health. A Cursor importer that exits because its source or Elasticsearch is unavailable must be restarted when ready.

## 4. Perform real actions

### Cursor

Open the Kibana workspace in Cursor and start a normal agent chat. Substitute your repository's absolute path:

> Read `data/entity_intelligence/ei-demo-sensitive/customer_records.txt` from this Kibana workspace and tell me the customer reference number.

Confirm Cursor actually called a tool rather than answered from context. The recorded demonstration used `read_file_v2`; a terminal read can use `run_terminal_command_v2`. The expected answer is `DEMO-001`. The read remains allowed because this policy only detects.

### Agent Builder

As the intended demo user, start a normal conversation with an agent that can execute ES|QL:

> Look up the customer in `ei-demo-sensitive-records` and tell me their reference number. Run an ES|QL query to retrieve the record.

The agent should call `platform.core.execute_esql`. A preceding `platform.core.get_index_mapping` can also match the broad policy. A prompt alone, refusal, or answer without a matching native tool call does not create this policy finding.

### Investigate

After ingestion and rule execution, refresh Entity Intelligence. Open the Cursor session or Agent Builder invocation and select the finding on the actual tool call. Verify its original timestamp, recorded input, native source document/call ID, real detection alert, matched clause, policy revision, and immutable definition/hash.

Mode is monitor and enforcement outcome remains unknown. Neither tool success nor tool failure establishes enforcement by this policy. Cursor's `james` label represents recorded local OS ownership, not an authenticated requester. Agent Builder retains the recorded initiating-user hash; a real name is resolved only when the accessible exact conversation-round author matches that hash and trace. The resolver requires one matching round, an ordinary authenticated-user call, and an exact author ID/hash match. Conversation owners/current viewers are not substitutes. If only the browser can access that private conversation, expect the graph to resolve the name while the collector's immutable finding retains its original hash.

Agent Builder events carry top-level `trace.id` and native span/invocation IDs. Tool calls attach to their nearest recorded agent ancestor, not an outer or sibling agent sharing the trace.

## 5. Show an edit and another revision

Edit the same policy and narrow **Tool name is one of** to:

```text
read_file_v2, run_terminal_command_v2, platform.core.execute_esql
```

Keep the marker/providers, save, then perform fresh actions in both applications. Both conditions must now match the same call: exact case-sensitive tool name AND case-insensitive literal input text. A subsequent mapping lookup no longer matches this revision; ES|QL execution can still match.

Every save increments the revision and resets `effectiveFrom`. Existing findings preserve their original clause, policy-definition snapshot/SHA-256, source reference, and captured input. Editing/disabling never rewrites old events or alerts. Re-enabling creates a new revision requiring a new action for this demo.

For a disable/enable check, compare the exact new native call IDs, timestamps, and revisions. An alert arriving late for an earlier call does not show that a disabled policy matched new activity. Total alert count alone is not a valid check.

## Timing and limits

| Stage               | Timing or coverage                                                                                                                                                                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursor              | Source persistence plus importer polling: 60 seconds in this guide. A completed read may precede its next import.                                                                                                                                                                        |
| Agent Builder       | Completed spans must be exported/indexed. Round-author evidence may arrive later than the tool span; an unresolved hash remains explicit.                                                                                                                                                |
| Policy monitor      | 60 seconds between completed passes in this guide (script default: 10), plus queries/index refresh.                                                                                                                                                                                      |
| Detection rules     | New matches request scheduling; execution is asynchronous. Rules also run every minute with a 25-hour lookback and a 1,000-alert cap per run. Allow two to three minutes with the lower-frequency collector settings before diagnosing a stalled stage; this is not a latency guarantee. |
| Evaluation window   | Latest 24 hours after each enabled policy revision's effective time; no unbounded historical backfill.                                                                                                                                                                                   |
| Source/match bounds | 5,000 tool documents per provider/pass, 5,000 Agent Builder ancestry spans, and 5,000 matches per provider/pass. Bounds, failed shards, or missing ancestry are partial coverage.                                                                                                        |
| Captured input      | Up to 8,000 visible redacted characters. Inputs above the redactor's 256,000-character processing limit are omitted. Missing input cannot satisfy an input condition, but a tool-name-only policy can still match.                                                                       |
| Actor lookup        | Matching calls only; at most 50 conversations per provider/pass, 2 MiB per response, 1,000 rounds. Inaccessible, ambiguous, or mismatched evidence leaves the hash unresolved.                                                                                                           |

Literal matching does not establish successful file access, actual sensitivity, export, compromise, or a bypassed guardrail. It observes available telemetry for the selected providers; it does not scan prompts, semantically interpret arbitrary policies, provide universal fleet coverage, or block actions. Codex is also selectable when its existing importer supplies the relevant captured tool input.

Event IDs derive from space, policy ID/revision, and exact native source index/document ID. Repeated polling uses create-only writes, preventing duplicate matches. Native importer records may update as tools complete; the finding retains its earlier captured snapshot/hash.

If nothing appears, check: policy enabled before the action → actual native tool/input imported → monitor provider status → detection-rule execution → source/alert permissions and UI refresh. No enabled policy for a provider means it is not being monitored. Missing/stale health is not an all-clear. Use the exact call and alert ancestry to distinguish ingestion, matching, and presentation issues.
