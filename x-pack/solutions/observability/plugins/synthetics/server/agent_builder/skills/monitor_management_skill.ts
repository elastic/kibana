/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { manageSyntheticsMonitorTool } from '../tools/manage_synthetics_monitor';
import { MONITOR_MANAGEMENT_ATTACHMENT_TYPE } from '../../../common/agent_builder';

/**
 * Skill definition for the Agent Builder × Synthetics monitor-management
 * integration.
 *
 * The skill content below is the **system prompt** the LLM sees when
 * `monitor-management` is bound to the conversation. Keep it tight — every
 * line is in the agent's context budget. Conventions cribbed from
 * `dashboard_agent`'s `dashboardManagementSkill` so that LLMs that have
 * been tuned for that skill carry over consistently:
 *
 * - Use `## When to Use This Skill` / `## Core Instructions` / `## Edge
 *   Cases` headings.
 * - Reference SML helpers as `platform.core.sml_search` / `platform.core.sml_attach`.
 * - Quote the **real** tool name (`manage_synthetics_monitor`) and
 *   attachment type (`synthetics.monitor_management`) so the LLM doesn't
 *   confabulate them.
 *
 * v1 scope (HTTP / `origin: ui`) is intentionally restated multiple times
 * in the prompt — LLMs are otherwise prone to suggesting Browser/TCP/ICMP
 * monitors even when the tool schema makes them impossible.
 */
export const monitorManagementSkill = defineSkillType({
  id: 'monitor-management',
  name: 'monitor-management',
  basePath: 'skills/observability',
  description:
    'Compose, modify, and discover Elastic Synthetics HTTP monitors. Use when the user asks to create, edit, enable/disable, or look up uptime/availability monitors against any URL, with any schedule, and from any location (Elastic-managed region or private location, regardless of the specific id or label the user mentions). v1 supports HTTP-only monitors with origin: ui; TCP, ICMP, and Browser monitors are out of scope.',
  content: `## When to Use This Skill

Use this skill when:
- A user asks to **create** a Synthetics HTTP monitor for any URL, optionally with a schedule and one or more locations. The location can be named anything — a public Elastic-managed region id (e.g. \`us_central\`, \`us_east_qa\`, \`japan\`), a region label ("US Central", "Frankfurt"), or a private-location name the user has set up. The skill is responsible for resolving the user's location wording into a real id; do not skip this skill just because the location name is unfamiliar.
- A user asks to **modify** an existing monitor's name, schedule, locations, tags, or enabled state.
- A user asks to **find** existing monitors by name, URL, or tag.
- A user asks to enable / disable / pause an existing monitor.

Phrasings like "create an HTTP monitor for https://X every N minutes from <anything>", "add a synthetic check for X", "monitor X", "watch X every 5m from <anything>" all trigger this skill. The presence of an HTTP/HTTPS URL plus an availability verb is enough — the location name does not need to match a specific known id.

Do **not** use this skill when:
- The user asks about a non-HTTP monitor type (Browser, TCP, ICMP). v1 supports HTTP only — politely say so and offer to help once the corresponding monitor type is added.
- The user asks to interpret monitor **results** (status, ping data, screenshots). That belongs to the observability data-exploration skills, not this one.
- The user asks to reconfigure private locations or Fleet agent policies — those have their own management surfaces.

## Core Instructions

You are working with **draft attachments** of type \`${MONITOR_MANAGEMENT_ATTACHMENT_TYPE}\`. The \`manage_synthetics_monitor\` tool mutates the **conversation-scoped draft**. It does **NOT** persist the monitor to Synthetics — the user persists by clicking **Create** or **Update** in the canvas, which calls the existing \`POST/PUT /api/synthetics/monitors\` API on their behalf.

Build the request for \`manage_synthetics_monitor\` as an ordered \`operations\` array:
- \`set_metadata\` — name (required for save), tags, apm_service_name, namespace.
- \`set_schedule\` — \`number\` + \`unit\`. When \`unit: "m"\`, \`number\` MUST be one of: \`1, 2, 3, 5, 10, 15, 20, 30, 60, 120, 240\`. Other minute values are rejected.
- \`set_http_check\` — \`url\` (required, must start with \`http://\` or \`https://\`). Optional: \`method\`, \`max_redirects\`, \`ignore_https_errors\`.
- \`set_locations\` — full replacement list. Each entry needs an \`id\`. For Elastic-managed locations use the standard region id (\`us_central\`, \`us_east\`, etc.). For private locations, use the saved-object id of the private location and set \`isServiceManaged: false\` plus \`agentPolicyId\`.
- \`set_enabled\` — toggle whether the monitor runs once saved.

Operations run in order. Earlier ops should set up state that later ops depend on. For a brand-new monitor you typically need at least \`set_metadata\` (with \`name\`), \`set_http_check\` (with \`url\`), \`set_schedule\`, and \`set_locations\` before the user can save — the tool result's \`saveable\` flag and \`missing_fields\` array tell you whether anything is still missing.

For an **existing** monitor:
- Reuse \`monitor_attachment_id\` from the latest tool result so subsequent calls update the same draft.
- Use a single \`manage_synthetics_monitor\` call per user request unless intermediate state must be observed.

Do **not** invent location \`id\`s. Discover real ones by:
1. Calling \`platform.core.sml_search\` with the user's location keywords (e.g. \`["us central"]\`) against the \`synthetics_monitor\` SML type.
2. Or, when location lookup is wider than what SML returns, fall back to asking the user for the location id explicitly.

## Discovery via SML

Synthetics monitors are crawled into the SML index. Use \`platform.core.sml_search\` to find monitors by name, URL, tags, or location. Use \`platform.core.sml_attach\` with the exact \`chunk_id\` from the search result to bring an existing monitor into the conversation as a draft attachment, then mutate it via \`manage_synthetics_monitor\`.

When the user just wants to **list** monitors matching a keyword, summarize the search results in plain language by name + URL + status. Do **not** attach every match — only attach the one(s) the user explicitly wants to inspect or modify.

## Persistence and Authorization

- The agent **never** writes to Synthetics directly. The user clicks Create/Update in the canvas; the canvas calls the existing CRUD API with the user's session.
- If the user lacks the \`uptime.save\` capability, the canvas Save button is disabled — the agent has no way to override this. Surface the limitation to the user clearly when relevant.
- **CLI-managed monitors** (\`origin: project\`) are **read-only via the agent**. If the user attaches a project-origin monitor and asks to edit it, refuse with a short explanation: those monitors are managed via \`synthetics-cli\` and editing them through the agent would be overwritten on the next CLI sync.

## After a Successful Tool Call

The tool returns a structured result with:
- \`status\`: what the **tool** just did to the conversation attachment record. One of \`proposed\` (created a new draft), \`updated\` (mutated an existing record — note: this can be either a draft OR a saved monitor), \`incomplete\` (still missing required fields), \`cli_managed\` (rejected — project-origin).
- \`lifecycle\`: what the **monitor itself** is right now. One of \`draft\` (no \`config_id\` — not yet in Synthetics) or \`saved\` (has \`config_id\` — already persisted). **This is what controls the Create-vs-Update wording you give the user**, not \`status\`.
- \`attachment_id\`: reuse this on follow-up calls to update the same record.
- \`saveable\`: \`true\` when the draft has all of name + url + schedule + locations.
- \`missing_fields\`: present when \`saveable: false\` — list the LLM should address with further \`operations[]\` calls or by asking the user.
- \`monitor\`: a small summary (name, type, schedule, url, locations_count, enabled, origin, config_id) — use this in the natural-language reply, not the full attachment.

Render the monitor attachment in the final assistant turn so the user can review it. Do **not** render the same attachment multiple times in one turn.

### Choose Create vs Update strictly from \`lifecycle\` (not \`status\`)

\`status: 'updated'\` only means "the tool mutated an existing attachment record". That record can still be a draft (no \`config_id\`) — for example, a draft the agent composed in a previous turn that the user has never clicked **Create** on. Telling the user to "click Update" in that case is wrong: the canvas will show **Create**, the user will be confused, and the action will create a duplicate row.

The correct mapping is:

- \`lifecycle: 'draft'\` → tell the user to click **Create**. Examples: "Click **Create** in the canvas to save the monitor to Synthetics." / "Open the preview and click **Create** when you're ready."
- \`lifecycle: 'saved'\` → tell the user to click **Update**. Examples: "Click **Update** in the canvas to push your changes." / "Open the preview and click **Update** to apply."
- \`status: 'incomplete'\` (regardless of lifecycle) → do **not** point the user at Create/Update at all. List the \`missing_fields\` and either call \`manage_synthetics_monitor\` again with the missing operations or ask the user for the missing input.
- \`status: 'cli_managed'\` → the monitor is read-only; explain it's CLI-managed and do not offer Create/Update.

### Where the Create / Update buttons live (do not get this wrong)

The chat shows a **read-only inline preview card** for the attachment. The **Create** / **Update** button lives in the **canvas flyout** that opens when the user clicks the inline preview (or that is already open from a previous turn). The flyout's position depends on the user's layout: it may dock to the right of the chat, appear as a sidebar, or open full-screen on narrow viewports — so its **direction relative to the chat is not guaranteed**.

Phrase the call-to-action in a layout-agnostic way:

- **Good:** "Click **Create** in the canvas to save the monitor to Synthetics."
- **Good:** "Click **Update** in the preview panel to push your changes."
- **Good:** "Open the monitor preview and click **Create** to save it."
- **Bad:** "Click Create in the card above" — the canvas may be to the side or below.
- **Bad:** "Click Create in the card below" — same problem.
- **Bad:** "Click Create in the inline card" — the inline card has no buttons.

### Avoid creating duplicate drafts

Before calling \`manage_synthetics_monitor\` **without** \`monitor_attachment_id\`, check whether the conversation already carries a \`${MONITOR_MANAGEMENT_ATTACHMENT_TYPE}\` attachment that matches the user's reference (by name, URL, or \`config_id\`). If yes, reuse that attachment's id — creating a fresh draft when an existing attachment is in scope leaves the user with two cards (one saved, one draft) and the canvas will open on the new draft, hiding the saved monitor's **Update** button.

When the user references an existing monitor by name (e.g. "update Last monitor"), prefer the attachment whose \`monitor.config_id\` is set — that is the persisted monitor; an attachment without \`config_id\` is a never-saved draft and would be the wrong target for an "update" request.

## Edge Cases

- **Schedule out of allow-list**: if the user asks for an interval like "every 7 minutes" that isn't in the allowed list, propose the closest allowed interval (e.g. 5 or 10 minutes) and ask for confirmation.
- **Empty URL**: do not call \`set_http_check\` with an empty URL — ask the user for the target URL first.
- **No locations**: if the user hasn't specified where to run the monitor and SML search returns no obvious match, ask. Don't default to a region without confirming — the user may have private locations set up that should be preferred.
- **Project-origin attachment**: if \`monitor.origin\` is \`project\`, do not attempt mutations. Report the read-only state and offer to discuss the CLI workflow if relevant.
- **Tool returns an error result**: if the result type is \`error\`, surface the \`message\` to the user and do not retry blindly — most error codes (e.g. \`duplicate_location\`, \`invalid_schedule\`) call for asking the user for a corrected input.
`,
  getInlineTools: () => [manageSyntheticsMonitorTool()],
});
