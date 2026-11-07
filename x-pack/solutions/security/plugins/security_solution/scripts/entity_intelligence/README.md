# External-agent collection and controlled security exercises

For the complete architecture, provider coverage, APIs, policy/detection flow, response limitations and review guide, see [engineering_reference.md](./engineering_reference.md).

## External Codex observations

This importer reads real local Codex rollout JSONL files. It exports an explicit metadata projection, with optional bounded redacted content, into `logs-codex.entity_intelligence-<space>`, a separate normal index. These records are not native OpenTelemetry spans or Agent Builder executions.

Run from the Kibana repository root with its pinned Node version:

```sh
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_codex_sessions.ts --dry-run
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_codex_sessions.ts --content redacted
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_codex_sessions.ts --content redacted --watch
```

The default target is `http://localhost:9200`, space `default`. Supply authentication through `ES_API_KEY`, `ES_USERNAME` and `ES_PASSWORD`, or `ES_AUTH`. Collector authentication values are never stored in the importer state or indexed observations. The development fallback is `elastic:changeme`. Remote endpoints require an explicit `--allow-remote` flag. The importer does not change Codex configuration.

By default, each pass selects the newest 200 files modified within 30 days from `$CODEX_HOME/sessions` (or `~/.codex/sessions`). `--sessions-dir`, `--days`, `--max-files` and `--space-id` customize that selection. Each selected file is read in full, up to 64 MiB, 200,000 records and 50,000 tool observations. Larger files are skipped and counted; malformed, truncated or bounded parses set `session.summary_complete=false`. Counts describe the selected observed files, not all activity or absence of activity.

Importer-owned state defaults to `data/entity_intelligence/codex_importer_state.json` in the repository; `--state-path` overrides it. Keep this file to preserve the installation's random agent ID, HMAC salt and unchanged-file checkpoints. The file is created with owner-only permissions. `--watch` repeats every 15 seconds (`--interval-ms` changes it); Ctrl-C stops. Stable document IDs make replay idempotent; `--reindex` replays selected unchanged files too. Per-file parser revision checkpoints also invalidate the cache after parser changes. No source documents are deleted. A source file that shrinks is marked incomplete; older indexed observations are retained. Restarting with the same state skips unchanged files.

Each session summary includes observed tool counts and outcomes, per-tool counts, model names, completed/aborted turn counts, and its last observed configuration. Tool observations carry actual source IDs, timestamps, model/sandbox/approval metadata and reliable duration when supplied. `source.id_kind` distinguishes a model tool-call ID from a native completed-item ID. A native completion uses its completion-record timestamp, including when merged with an earlier model request. Session IDs use the actual rollout/thread ID; the runtime session ID and parent thread ID remain separate. Copied fork history and explicitly foreign thread events are excluded.

The local source-file owner is attached as `owner` only when the source file UID matches the collector's current OS account. Its installation-salted ID and actual account name have `provenance=local_os_account`; this means local ownership, not an authenticated requester or the current Kibana viewer. Explicit `session_meta.creator_user_id` and `creator_account_id` become `creator` with `provenance=codex_session_creator`, without inventing a display name. A session creator does not identify the caller of each historical tool operation. Missing creator fields remain absent.

Metadata session labels include `agent_nickname`, the recognized `thread_source` role (`user`, `subagent`, `guardian_review`), and a bounded logical `agent_path` under `/root`. In redacted content mode, the collector also reads only matching thread IDs and their recorded titles from the local Codex `state_5.sqlite` database, through a read-only connection. `--titles-db` changes that optional source. Titles have explicit SQLite provenance and use the same redactor as prompts and inputs. Ownership and label fields do not change stable observation IDs.

Only explicit process exit codes, MCP `isError` booleans and typed file-change status establish outcomes. Textual outputs never determine success or failure. A completed turn does not prove that a session has ended: summaries keep `completion_known=false`, and session duration/end are omitted. `source.file_hash` is a salted identifier of the local filename, not its contents; `source.record_hash` is a salted fingerprint of the source record. Metadata-only mode does not export message or tool content. Reasoning, assistant messages, tool results and arbitrary private storage are excluded in both modes.

Content capture is opt-in: `--content metadata-only` is the default; `--content redacted` records actual user prompts and tool input fields. It captures native `UserMessage` text (or explicit legacy user-message events), native command arrays and MCP arguments, and model function/custom-tool inputs. It does not construct prompts from system or environment message wrappers. Each captured value carries its exact source field, source-record hash, and redacted/truncated flags. Session summaries retain the latest 50 prompts, each at most 4,000 characters; titles are limited to 240 characters and tool inputs to 8,000. An input above the redactor's 256,000-character processing bound is replaced with an omission marker.

The shared redactor masks recognized credential patterns, including password assignments, authorization headers, URL credentials and explicit username/password prose. A bounded first pass learns values from explicit credential contexts across the selected content so later title or command occurrences can be masked too. Cross-field learning avoids short ordinary words; explicit short credentials are still masked in their credential context. Unqualified Basic/Bearer prose and password feature descriptions do not train global replacements. This is pattern-based filtering, not a guarantee that every possible secret is recognized. Content remains local to the configured Elasticsearch target and is stored in `_source` without full-text indexing. Do not enable content capture for material that must never leave its original source.

Inventory and activity queries request only metadata and bounded titles. Prompts and tool inputs load on demand for the exact selected provider, space, installation, session and document. Failed or pending authorization refreshes hide prior content; the detail query does not retain content in an inactive cache. Metadata-only or uncaptured inputs remain explicitly unavailable rather than reconstructed.

Model tool calls (including orchestration wrappers) and native tool completions are distinct observation types. Exact matching source IDs are merged; absent a recorded parent/call link, the importer does not guess that a wrapper and its runtime operations are the same invocation. Counts represent tool observations, not unique end-to-end invocations.

The index template uses strict mappings and priority 501 for its exact index name, avoiding the built-in `logs-*` data-stream template. It does not alter native Agent Builder templates or data. After recreating an index or upgrading the parser, use `--reindex` with the existing state file to retain stable identities.

Tests:

```sh
node scripts/jest --config x-pack/solutions/security/plugins/security_solution/scripts/jest.config.js --runInBand --coverage=false --runTestsByPath x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/codex_session_parser.test.ts x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/codex_index.test.ts x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/codex_identity.test.ts x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/codex_content.test.ts
node scripts/jest --config x-pack/solutions/security/plugins/security_solution/public/entity_analytics/jest.config.js --runInBand --coverage=false --runTestsByPath x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/codex_model.test.ts x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/codex_content.test.tsx x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/use_codex_content.test.tsx x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/codex_intelligence.test.tsx x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/session_graph.test.tsx x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_intelligence/ai_agents/codex_session_trail.test.tsx
```

## Collector lifecycle

Run collectors explicitly in a terminal using the examples above. No collector, service or automation is installed by this branch. Use one watcher per provider/installation and preserve its state file for stable identities. Keep logs counts-only; do not commit imported transcripts, audit journals, checkpoint salts or local credentials.

Before stopping a watcher, inspect its actual process command and verify that it belongs to this test checkout. Do not reuse a PID from documentation: operating systems reuse PIDs. Ctrl-C stops a foreground watcher. Use `--dry-run` for an inspection pass without indexing.

Content mode and parser upgrades may require an explicit `--reindex` with the existing state. The importer can only redact source values it recognizes; a test result is not a guarantee that every possible secret has been removed. Review source sensitivity before enabling content capture.

## External Cursor observations

The Cursor collector reads the installed application's local conversation SQLite database through a read-only transaction. The default macOS source is `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`; `--state-db` overrides it. It selects only conversation headers and exact referenced composer/bubble records, never `ItemTable` authentication values or unrelated storage. It does not alter Cursor settings or source records.

```sh
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_cursor_sessions.ts --dry-run
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/import_cursor_sessions.ts --watch
```

This importer writes `logs-cursor.entity_intelligence-<space>` using the same loopback-only endpoint and environment authentication options as Codex. `--space-id`, `--days`, `--max-sessions`, and `--max-bubbles` scope the read. Defaults are 30 days, 100 recent conversations and 10,000 bubbles per conversation, with a 256 MiB overall source-read bound and per-record bounds. Missing, capped or malformed evidence remains partial. The stable random installation ID and HMAC salt are stored separately in owner-only `data/entity_intelligence/cursor_importer_state.json`; keep this file for repeat imports. Repeat imports overwrite stable document IDs; they do not duplicate observations or delete older evidence.

Recorded composer titles, user prompts and tool inputs use the shared bounded redaction contract before indexing. The collector excludes assistant reasoning/text, output bodies, file diffs and unrelated private storage. Titles are limited to 240 characters, prompts and inputs to 8,000 characters, and summaries retain up to 50 prompts. Text stays in `_source` without full-text indexing; the UI fetches prompts and inputs only for a selected observation. Cursor's request status `completed` alone does not establish tool success: only explicit result fields or process exit codes do. Session completion, missing models, caller identity, permissions and duration are not inferred.

Explicit `parentComposerId` links become parent sessions; models come from recorded bubble model metadata. The complete recorded model set is retained separately from the last timestamped model. Sessions with multiple recorded models are excluded from comparisons that require a single matching model, and the investigation explains this beside the session header. Local ownership is attached only when the database file UID matches the collector OS account, with `local_os_account` provenance; it does not identify an authenticated tool caller. Imported sessions appear as a Cursor installation in All identities, alongside users, hosts, services, Agent Builder and Codex; the Cursor drill-in reuses the provider-scoped session, graph, activity and evidence views.

Use `--watch` to refresh changed conversations every 60 seconds (`--interval-ms` overrides, minimum 10 seconds); `--reindex` replays unchanged sessions on the first pass only. Per-session fingerprints include the parser revision and contain salted hashes, allowing subsequent passes to skip unchanged records. Ctrl-C stops the collector. Before starting a watcher, check for an existing `import_cursor_sessions.ts` process to avoid duplicates.

Run a single Cursor watcher with the existing installation state. Stop it with Ctrl-C, or verify its actual command before sending a signal. This branch does not install a background collector or transfer any existing sessions.

## Security detections and controlled policy exercise

Entity Intelligence now reads real detection-engine alerts in the overview, entity dossier, Codex/Cursor session and Agent Builder invocation. Findings distinguish a recorded enforcing denial (`Blocked`), a prohibited operation explicitly allowed (`Policy violation`), and an ordinary detection whose enforcement outcome is unknown (`Detected`). Tool failures, behavioral changes, severity and closed alert workflow do not establish a guardrail outcome. Details include actor provenance, policy explanation, control engine, observed/detected times and exact alert/source links in Discover.

The shared event contract is `common/entity_intelligence/security_events.ts`. Structured observations live in the exact space index `logs-entity_intelligence.security-<space>`. The five query rules cover blocked protected-file access, blocked export, allowed prohibited export, unapproved privilege change and suspicious authentication. Rules execute every minute over a 30-minute lookback and have no notification actions. The setup command writes only source events and installs these rules; Elasticsearch's detection engine creates the alerts.

Run a harmless exercise from the actual agent session you want to investigate. First obtain its installation ID and session ID from the imported session metadata. Do not copy another session's ID, including a parent or subagent ID, merely because it shares an installation; use the ID of the session actually executing the command. The gateway accepts these as caller-supplied correlation metadata; they are not a cryptographic attestation or an authenticated requester identity.

```sh
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/security_policy_gateway.ts \
  --sandbox /private/tmp/entity-security-exercise-NEW \
  --provider codex --agent-id VERIFIED_INSTALLATION_ID --session-id VERIFIED_SESSION_ID \
  --space-id default --output /private/tmp/entity-security-exercise-NEW/security_events.ndjson

node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/setup_security_story.ts \
  --events /private/tmp/entity-security-exercise-NEW/security_events.ndjson --dry-run
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/setup_security_story.ts \
  --events /private/tmp/entity-security-exercise-NEW/security_events.ndjson
```

Use a new absolute sandbox directory whose parent exists, without symlink ancestors. The gateway creates its own inert fixtures: one public read is allowed, one protected read and one export are blocked before reading/transferring, then a monitor-mode export copies the inert fixture into a local sink. It reads no existing private files and makes no network transfers. The recorded engine is **Local exercise policy gateway**, not the Codex/Cursor native sandbox. The OS account name identifies the process account, not a verified human requester. Cursor can run the same command with `--provider cursor` and its verified imported IDs.

### Findings on exact native tool calls

The four-action command above proves only session-level gateway activity. It cannot identify four separate native tool invocations. For an auditable tool-level example, run **one operation per actual agent tool call**, each with a new sandbox and request UUID. Use the installation and session IDs of the session that executes the command; a short dedicated session avoids source and query limits. The following is one literal command, run from the Kibana repository root (replace the explicit IDs and UUID):

```sh
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/security_policy_gateway.ts --sandbox /private/tmp/entity-security-call-NEW --provider codex --agent-id RECORDED_INSTALLATION_ID --session-id RECORDED_EXECUTING_SESSION_ID --space-id default --action read_protected_fixture --mode enforce --request-id NEW_UUID --output /private/tmp/entity-security-call-NEW/event.ndjson
```

`read_public_fixture` is the permitted negative control; `read_protected_fixture` and `export_protected_fixture` are denied before protected I/O. Each command operates only on its own newly created inert fixture and local sink. A blocked single operation returns process exit code **77**; an allowed operation returns **0**. These statuses become real native `exec_command` results in Codex. Do not wrap the gateway command in `echo`, compound shell commands or a script, and do not substitute another agent session's ID. An absolute Node executable is accepted. Existing four-operation library/CLI exercises retain monitor-mode support, but an enforcing demonstration needs no protection changes or monitor execution.

Wait for the existing Codex importer to capture each completed native command with redacted content enabled. Then combine only those raw event files into a new NDJSON file and bind them before indexing:

```sh
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/bind_security_invocations.ts --events /private/tmp/entity-security-raw.ndjson --output /private/tmp/entity-security-bound.ndjson
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/setup_security_story.ts --events /private/tmp/entity-security-bound.ndjson --dry-run
node -r @kbn/setup-node-env x-pack/solutions/security/plugins/security_solution/scripts/entity_intelligence/setup_security_story.ts --events /private/tmp/entity-security-bound.ndjson
```

The binder reads the exact local Codex installation/session/space, validates the complete native gateway command and request UUID, and requires the recorded exit code to agree with the control result. It records the native call ID, recorded turn ID when available, exact imported document/input hash and bounded redacted input. Model wrappers, duplicate candidates, truncated inputs, different scope/arguments, and partial or capped searches fail closed. The query is capped at 1,000 native command observations; select a shorter session when that bound is exceeded. Request UUIDs propagate explicit correlation; timestamps, tool names, neighboring prompts and session membership do not establish invocation linkage. The binder does not read outputs, infer prompt causality, modify Codex settings, or write Elasticsearch. It writes a new owner-only local evidence file; normal setup then indexes source events and schedules the existing detection rules.

Version 2 gateway evidence includes the exact matched clause, its condition and expected decision, a complete bounded policy-definition snapshot, and its SHA-256 fingerprint. Strict ingestion verifies the snapshot fingerprint, clause membership, control decision and invocation result before accepting the source event. Policy inputs and captured commands remain outside full-text indexing. The detail view can inspect the policy that actually evaluated this operation; the separate Elastic detection rule describes why its recorded result became an alert. Native Codex/Cursor guardrails remain separate controls, and the local OS account remains an ownership identity, not a verified human requester.

Optionally append all five flags to the setup command to generate an additional connected user/host story: `--entity-user-name`, `--entity-user-id` (canonical entity ID), `--entity-host-name`, `--entity-host-id` (ECS host ID), and `--entity-host-entity-id` (canonical entity ID). Resolve these from the actual Entity Store first. The four generated observations preserve `actor_provenance=generated` and `scenario.kind=generated`; their explicit policy explanations distinguish them from real endpoint actions. Source IDs are deterministic per scenario, space and step. Replaying the same event file upserts the same documents without duplicating alerts. Run a fresh exercise to produce current events after the detection lookback has elapsed.

Both setup endpoints are restricted to loopback. Defaults are Elasticsearch on port 9200 and Kibana on 5601. Authentication uses the existing `ES_API_KEY` or `ES_USERNAME`/`ES_PASSWORD`/`ES_AUTH` environment convention (development fallback `elastic:changeme`); Kibana accepts `KIBANA_API_KEY` or `KIBANA_USERNAME`/`KIBANA_PASSWORD`. Credentials and raw response bodies are not logged. Rule updates require the exact rule ID and the owned `Structured security evidence` tag.

Session findings resolve exact source-event IDs before querying alert ancestry, because session metadata is not indexed on detection alerts. User/host findings prefer explicit entity IDs; legacy name-only correlations remain partial. Results are capped at 100 alerts and 1,000 source events over 30 days, with honest coverage labels. Cursor/Agent Builder sessions without matching security telemetry do not acquire a security verdict from ordinary tool errors. This provides the integration contract for real control telemetry; native guardrail ingestion remains a separate integration.

### Investigating findings in the existing graphs

Security findings appear inside the existing session and entity graphs. In the Codex/Cursor session map, exact invocation evidence places the finding on its recorded tool call, with command, outcome, policy and tool-evidence actions. Matching requires the same installation, provider, session, native call, source document, input record hash, exit code and recorded turn when supplied. Findings without exact invocation evidence remain in a collapsed session-level section; linked calls outside the loaded activity are labeled separately. The Activity tab can filter to calls with findings, and tool evidence links back to the finding. Prompts do not acquire findings from proximity alone. Agent Builder findings remain invocation-level unless exact tool attribution is available. Related session branches can be expanded when investigating a busy session.

The entity graph attaches explicit policy/scenario events to the selected canonical entity. The connected user/host example shows sign-in, privilege change, blocked protected-file access, and allowed prohibited export. Ordinary detection alerts remain available through the existing graph evidence and entity dossier. Graph time and severity filters also apply to attached findings, within the shared 30-day evidence query. Scenario connections represent recorded order, not proof that one event caused another; unrelated events do not acquire ordering edges.

Finding details lead with the action and outcome, then show the recorded actor, affected target, policy explanation, decision versus mode versus actual outcome, observed/detected times, and exact alert/source evidence links. Identity provenance and control-engine identifiers remain available in the technical record. Unknown outcomes, missing telemetry, and query coverage are explicit. The graph represents loaded alert evidence; permitted activity without an alert is not added as an inferred event.

## Claude Desktop MCP boundary demo

The portable ordinary-chat MCP server is included under [demos/claude_desktop](./demos/claude_desktop/README.md). It reads one exact synthetic fixture and journals bounded tool-boundary evidence; it does not read arbitrary Claude chats or authenticate a human requester. Use the separate importer and monitor-only policy flow after opting into the demo. No Claude Desktop configuration is changed automatically.

## Google ADK and response

Google ADK run parsing/import is included in this directory. Cloud deployment and native Workflow response prerequisites are documented in [engineering_reference.md](./engineering_reference.md) and the included demo sources. Imported run records, cloud credentials, existing deployment configuration and saved execution receipts are not part of this branch. A Google denial or native response must be verified from an actual configured run; UI labels alone do not establish prevention.
