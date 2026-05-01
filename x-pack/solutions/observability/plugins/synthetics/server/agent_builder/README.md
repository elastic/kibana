# Synthetics × Agent Builder

The Synthetics plugin contributes a `monitor-management` skill, a
`manage_synthetics_monitor` inline tool, a
`synthetics.monitor_management` attachment type, and a
`synthetics_monitor` SML type to the
[Agent Builder](../../../../../../platform/plugins/shared/agent_builder/README.md)
framework. This README is the entry point for engineers extending the
integration. The bulk of the design rationale, spike findings, and
acceptance criteria live in the longer notes folder at
`~/.agents/synthetics-agent-builder/notes/`; this doc is the in-repo
TL;DR.

## What does it do

In a chat conversation:

1. The user asks for a monitor (*"create an HTTP monitor for
   `https://example.com` every 5 minutes from `us_central`"*).
2. The agent loads the `monitor-management` skill, which scopes its
   tool surface to `manage_synthetics_monitor` plus the platform's
   SML helpers.
3. `manage_synthetics_monitor` builds an in-memory **draft** by
   applying the LLM's `operations[]` (set_metadata, set_schedule,
   set_locations, set_http_check, set_enabled). Each op runs a Zod
   refine; cross-field saveability is checked at batch boundary.
4. The draft becomes a `synthetics.monitor_management` attachment
   with `status: 'proposed'`. The chat UI renders the inline card
   (browser-side, lazy-loaded).
5. The user clicks the inline card → canvas flyout opens → clicks
   **Create**. The browser POSTs to `/api/synthetics/monitors`
   exactly as the existing monitor form does. On success, the
   attachment's `origin` flips from by-value to by-reference (the
   saved-object id) via the framework's `updateOrigin` callback.
6. Future turns in the same conversation can mutate the saved
   monitor via the same tool — `Update` button on the canvas issues
   a PUT.

The tool **never persists**. Only the Create / Update buttons in the
canvas write to Synthetics, and they do so under the user's session
with the existing `uptime-write` privilege check.

## Architectural pieces

| Piece | Files | Layer |
|---|---|---|
| Skill | `skills/monitor_management_skill.ts` | server |
| Inline tool (`manage_synthetics_monitor`) | `tools/manage_synthetics_monitor/` | server |
| Attachment type (`synthetics.monitor_management`) | `attachments/monitor_management_attachment_type.ts` | server |
| SML type (`synthetics_monitor`) | `sml/monitor_sml_type.ts` | server |
| Server-side bind | `bind_on_setup.ts` | server |
| Browser-side bind | `../../public/agent_builder/bind_on_start.ts` | client |
| Inline content (chat card) | `../../public/agent_builder/attachments/monitor_management_inline_content.tsx` | client |
| Canvas content (flyout) | `../../public/agent_builder/attachments/monitor_management_canvas_content.tsx` | client |
| Canvas action wiring | `../../public/agent_builder/attachments/use_monitor_canvas_actions.ts` | client |
| Canvas Create/Update HTTP wrappers | `../../public/agent_builder/attachments/monitor_management_actions.ts` | client |
| Shared Zod schemas + types | `../../common/agent_builder/` | common |

This is the "5+3 piece" pattern referenced across Agent Builder
integrations (5 server pieces, 3 client pieces). The exact same shape
is used by `dashboard_agent` and the alerting v2 rule attachment.

## The `operations[]` surface

`manage_synthetics_monitor` accepts a discriminated-union array of
mutations applied in order to a single in-memory draft. Each op is a
Zod schema with its own `.refine` checks; per-op invariants fail at
parse time, cross-field invariants are caught when
`assertMonitorDraftSaveable` runs at batch boundary.

| Op | Mutates | Per-op checks |
|---|---|---|
| `set_metadata` | name, tags, apm_service_name, namespace | name length, tag count |
| `set_schedule` | schedule.number + schedule.unit | allow-listed values (1, 3, 5, 10, 15, 30, 60, 120, 240 minutes) |
| `set_http_check` | urls, request_method, max_redirects, ignore_https_errors | URL must parse as `http`/`https` |
| `set_locations` | locations[] (replaces — not merges) | non-empty, ids must look like ids |
| `set_enabled` | enabled boolean | — |

v1 is HTTP-only (`MONITOR_TYPE: z.literal(MonitorTypeEnum.HTTP)`). TCP
/ ICMP / Browser would extend the schema to a discriminated union.

## Auth + persistence model

- **Tool never persists.** Mutations live in the per-conversation
  attachment store. There is no synthetics CRUD path through
  `manage_synthetics_monitor`.
- **Canvas Create / Update buttons** call the existing public
  synthetics REST endpoints (`POST` / `PUT
  /api/synthetics/monitors[/{configId}]`) under the user's session.
  Authorization rides on `uptime-read` + `uptime-write` (already
  required by the route). The canvas mirrors the SPA's monitor form
  in this regard — secrets ride plaintext in the JSON body, server
  encrypts via `formatSecrets` before persisting.
- **Capabilities:** the canvas reads
  `application.capabilities.uptime.save` (disables Create / Update
  with a "missing privilege" tooltip if false) and
  `application.capabilities.uptime.elasticManagedLocationsEnabled`
  (disables only when the draft uses Elastic-managed locations).
- **Project-origin (CLI-managed) monitors** are read-only. The tool
  refuses to mutate; the canvas surfaces a callout explaining the
  CLI workflow and shows only a "View in Synthetics" button.

## Registration gate

There is **one** gate: the optional `agentBuilder` plugin's presence.
Both `bind_on_setup.ts` (server) and `bind_on_start.ts` (browser)
short-circuit silently when the plugin isn't loaded. There is **no
synthetics-side feature flag** — the Agent Builder UX itself is the
gate, and an extra micro-FF would be dead config surface.

The `monitor-management` skill id must also be present in
[`@kbn/agent-builder-server/allow_lists.ts`](../../../../../../platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts).
That file is hand-curated by the Agent Builder team as a cross-team
review trigger — adding new built-in skills/tools/agents will pull
their reviewers in.

## Local dev setup

Minimum config in `config/kibana.dev.yml`:

```yaml
xpack.agentBuilder.enabled: true

# An LLM connector reachable from your machine.
xpack.actions.preconfigured:
  smoke-test-llm:
    name: 'Smoke-test LLM'
    actionTypeId: .gen-ai
    config:
      apiUrl: https://api.openai.com/v1/chat/completions
      apiProvider: 'OpenAI'
      defaultModel: 'gpt-4o'
    secrets:
      apiKey: '<your key>'
```

Start ES + Kibana, then verify the bind ran:

```bash
node x-pack/solutions/observability/plugins/synthetics/scripts/agent_builder_monitor_smoke.js
```

This is non-LLM, ~30s, and tests both that the skill registered and
that the canvas Save payload round-trips through the synthetics REST
API. See its docstring for env-var overrides.

For end-to-end manual verification with a real chat surface, follow
the tiered scenario doc at
`~/.agents/synthetics-agent-builder/notes/01-monitor-management/smoke-tests.md`.

## File map

```
server/agent_builder/
├── README.md                           (this file)
├── bind_on_setup.ts                    main entry — registers all 4 pieces
├── bind_on_setup.test.ts
├── skills/
│   └── monitor_management_skill.ts     skill content (LLM system prompt)
├── tools/
│   └── manage_synthetics_monitor/
│       ├── manage_synthetics_monitor.ts    tool handler (operations dispatch)
│       ├── operations.ts                   Zod discriminated union of ops
│       └── monitor_draft.ts                executeMonitorOperations + saveability checks
├── attachments/
│   └── monitor_management_attachment_type.ts   resolve / isStale / format
├── sml/
│   └── monitor_sml_type.ts             SML chunking strategy (per-monitor chunks)
├── internal/
│   └── monitor_attachment_data.ts      shared bulkGet → schema-projection helper
└── register_data_provider.ts           (existing — observability data providers)

public/agent_builder/
├── bind_on_start.ts                    browser-side bind entry
└── attachments/
    ├── monitor_management_attachment_definition.tsx   AttachmentUIDefinition factory
    ├── monitor_management_inline_content.tsx          chat card
    ├── monitor_management_canvas_content.tsx          flyout body
    ├── monitor_management_status.tsx                  shared status helpers
    ├── monitor_management_actions.ts                  Create/Update HTTP wrappers
    └── use_monitor_canvas_actions.ts                   Canvas action button wiring (returns ActionButton[])

common/agent_builder/
├── monitor_management_constants.ts                    type ids
└── monitor_management_attachment_schema.ts            Zod (MonitorAttachmentData + MonitorDraft)
```

## Followups

Tracked in `~/.agents/synthetics-agent-builder/notes/01-monitor-management/followups.md`.
Selected highlights:

- **TCP / ICMP / Browser monitor types** — extend the v1 HTTP-only
  schema to a discriminated union (with new ops e.g.
  `set_tcp_check`).
- **`params` / inline parameter editor** — currently treated as
  opaque secret-key. Users will eventually want to author params via
  chat.
- **Diagnosis merge** — connect the in-flight Synthetics diagnosis
  skill (separate POC) so the agent can explain a saved monitor's
  failure modes from the same canvas.
- **Multi-space edge cases** — `synthetics-monitor-multi-space` SO
  type vs legacy `synthetics-monitor`. SML chunking already handles
  this defensively, but the attachment `resolve` path could still
  mishandle a cross-space edit.
- **`isStale` UI banner** — server hook fires today; the canvas
  doesn't visually surface it. Captured in `smoke-tests.md` as
  "currently NOT smoke-testable".
- **Rich Overview tile in the canvas** — sparkline trend, last-status
  icon, latency, errors. Requires plumbing
  `OverviewStatusMetaData` outside the synthetics SPA.
- **Scout UI E2E suite** — outline at
  `~/.agents/synthetics-agent-builder/notes/01-monitor-management/scout-outline.md`,
  blocked on Agent Builder shipping a stub LLM connector or stable
  conversation-seed API.

## Where to go next

| Question | Answer |
|---|---|
| How does Agent Builder route attachments to inline / canvas renderers? | `dashboard_agent` is the canonical precedent; see `x-pack/platform/plugins/shared/dashboard_agent/public/attachment_types/` |
| What's the AttachmentUIDefinition contract? | `x-pack/platform/packages/shared/agent-builder/agent-builder-browser/attachments/contract.ts` |
| Where does the Agent Builder plugin live? | `x-pack/platform/plugins/shared/agent_builder/` (read its README first) |
| Why is there no feature flag? | See the design discussion captured in `~/.agents/synthetics-agent-builder/notes/00-cross-cutting-decisions.md` |
| How do I plan a new Synthetics × Agent Builder use case? | The `kibana-agent-builder-expert` subagent + the structured loop in `~/.agents/synthetics-agent-builder/notes/README.md` |
