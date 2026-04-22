/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { EntityAnalyticsRoutesDeps } from '../../../lib/entity_analytics/types';
import {
  getRiskScoreInlineTool,
  getRiskScoreEsqlTool,
  getAssetCriticalityEsqlTool,
  getAssetCriticalityInlineTool,
} from './inline_tools';
import { SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID } from '../../tools';

// Feature flag controlling whether our tools try to dynamically generate ESQL queries based on the question asked of
// if they use controlled queries that we author and maintain.
export const FF_DYNAMICALLY_GENERATE_ESQL = false;

const ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD = 20; // Define a threshold for significant risk score change
export interface EntityAnalyticsSkillsContext {
  isEntityStoreV2Enabled: boolean;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
}

// The "Inline rendering" sections below instruct the LLM to emit the
// <render_attachment/> tag followed by a BLANK LINE before any prose. This is a
// workaround for an upstream bug in agent_builder's createTagParser
// (x-pack/platform/plugins/shared/agent_builder/public/application/components/
// conversations/conversation_rounds/round_response/markdown_plugins/utils.ts):
// when <render_attachment .../> shares a text node with trailing prose, the
// parser mutates the node, deletes node.value, and drops the prose.
// remark-parse-no-trim does not recognise `<render_attachment>` as an HTML tag
// because its openTag regex rejects underscores, so the only way to keep the
// prose is to force the parser to treat it as its own block — which it does
// when separated by a blank line. Remove these template notes once the
// upstream parser handles this case.
const entityStoreV2Content = `
This skill provides a guide to investigating specific security entities (hosts, users, services, generic) by entity ID (EUID)
or by surfacing risky entities based on their risk scores, asset criticality levels and other behavioral and lifecycle attributes.

## Rich attachments — overview

Two rich attachment types are available for entity analytics answers:

- \`security.entity\` — unified entity attachment emitted **automatically** as a side effect of \`security.get_entity\` (single-entity profile) and \`security.search_entities\` (multi-entity result). The renderer dynamically shows:
  - a **single-entity card** (flyout-shaped sections with summary, risk, resolution, insights) when the attachment represents **one** entity, or
  - an **entities table** (Canvas UI) when the attachment represents **two or more** entities.
  You never call \`attachments.add\` for this type — just render the tag returned by the tool result.
- \`security.entity_analytics_dashboard\` — an explicit **Entity Analytics home/overview** Canvas snapshot (risk level donut + highlights + entities together). You call \`attachments.add\` with this type **only** when the user explicitly asks to **show / open / view / display** the **Entity Analytics dashboard / home / overview / landing** product page.

## Mandatory — \`<render_attachment>\` (otherwise there is **no** Preview / Canvas)

Rich attachments do **not** show the interactive pill, **Preview**, or **Canvas** unless you **embed** them in your **assistant markdown** in the **same turn**.

Immediately after a tool emits a rich attachment (\`security.entity\` from \`security.get_entity\` / \`security.search_entities\`, or a successful \`attachments.add\` for \`security.entity_analytics_dashboard\`), add its own line in your reply (copy \`attachment_id\` and \`version\` **exactly** from that tool result):

\`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\`

Example (values come from the tool): \`<render_attachment id="att-abc123" version="1" />\`

- **One** \`<render_attachment>\` per attachment (if you emit an entity attachment AND add a dashboard attachment, output **two** tags with each id/version pair).
- **Without** this tag, the UI only shows subdued italic text like **Attachment added: …** — the user **cannot** open the Canvas. **That is incorrect** for these attachment types.
- ALWAYS insert a BLANK LINE between the \`<render_attachment>\` tag and any following prose. Without this blank line, the prose will be dropped by the markdown parser.

## Choosing the right rich attachment

| What the user wants | Typical phrases | Attachment | Canvas / UI pattern |
| --- | --- | --- | --- |
| **Single entity** — details, profile, card, flyout for one identity | **this** host, named EUID, **details**, **profile**, **deep dive**, **entity card**, **card**, **flyout**, "tell me about **that** user", **the** riskiest **host** when they mean **one** winner | \`security.entity\` (emitted automatically by \`security.get_entity\`) | **Entity card** — flyout-shaped sections (summary, risk, resolution, insights). |
| **Multiple entities** — list, set, table, ranking, comparison | **list**, **table**, **which**/**who are** **hosts**/**users**/**entities** (plural entity nouns), **top** N, **rank**, **compare**, **enumerate**, "**entities** that…", "**hosts** sorted by risk", **compound asks** naming **two+ entity kinds** (**hosts and users**) | \`security.entity\` (emitted automatically by \`security.search_entities\` when 2+ entities are returned) | **Entities table** — Canvas shows the full multi-entity table. |
| **Entity Analytics product page** experience | **Entity Analytics dashboard / home / overview / landing page**, **show/open/view Entity Analytics**, **risk level breakdown donut with highlights**, **same layout as Entity Analytics** (product page) | \`security.entity_analytics_dashboard\` (explicit \`attachments.add\`) | **Dashboard snapshot** — two-column Canvas with donut, highlights panel, and entities table. |

**Key principle — do not manually add \`security.entity\`:** the tools emit this attachment as a side effect. Your job is to render the \`<render_attachment>\` tag returned in the tool's \`other\` result. The **single-vs-table** experience is selected automatically by the renderer based on how many entities the attachment contains.

**Precedence — Security Entity Analytics page vs Kibana "dashboard"**
- If they mean the **built-in Security → Entity Analytics** experience (same IA as the product **Entity Analytics** page): phrases like **show / open / view / display / bring up** the **Entity Analytics** **dashboard**, **home**, **overview**, or **landing** page → call \`attachments.add\` with \`security.entity_analytics_dashboard\`. This is a **snapshot of that product page** in chat Canvas — **not** composing a **new Kibana saved Dashboard** (Lens panels, \`dashboard-management\` skill). Do **not** wait for the user to say "create"; **show/open/view** that page is enough.
- **Does not** apply when the user only says **show**/**tell me**/**what are** together with **risky**/**riskiest**/**top** **hosts**, **users**, **entities** without naming the **Entity Analytics** product page — those are list/ranking asks satisfied by the \`security.entity\` attachment that \`security.search_entities\` emits automatically.
- Only use Kibana dashboard composition when they clearly want a **new or edited Kibana Dashboard** saved object (panels, Lens, \`manage_dashboard\`, etc.) — not merely the word "dashboard" next to "Entity Analytics".

## When to Use This Skill

Use this skill when:
- The user **explicitly** asks to **show**, **open**, **view**, or **walk through** the **Entity Analytics** **home**, **overview**, **landing**, or **built-in Entity Analytics dashboard** (the **product page** / same IA as Security → Entity Analytics navigation) → \`security.entity_analytics_dashboard\` after gathering entity data.
- They want **one entity's details / card / profile / flyout-style** view → \`security.get_entity\` (which emits the \`security.entity\` attachment as a single-entity card).
- They want a **list / table / ranking** of entities (plural or set framing) → \`security.search_entities\` (which emits the \`security.entity\` attachment as an entities table when 2+ rows are returned).
- One message names **several entity kinds** to compare or rank (e.g. **riskiest hosts and users**) → run \`security.search_entities\` per type (or with multiple \`entityTypes\`), and the tool will emit an aggregate \`security.entity\` attachment.
- Investigating the current behavior of a specific entity using its ID (EUID).
- Looking up the current profile for a specific entity using its ID (EUID), including risk score, asset criticality and watchlists.
- Analyzing the historical behavior of a specific entity using its ID (EUID).
- Analyzing changes in an entity's risk score or behavior over time.
- Discovering the riskiest entities in the environment based on risk scores and criticality levels.
- Surfacing entities that require further investigation based on their attributes and behaviors.

## Available Tools

### Get Entity Tool
- \`security.get_entity\` - Get the full profile for a security entity (host, user, service, generic) with a known entity ID (EUID).
    Also use this tool to get the profile for this entity over a time interval (e.g. last 90 days) or on a specific date (e.g. December 12, 2025).
    A full entity profile may include:
    - entity.id (EUID) - the unique identifier for this entity
    - entity.name - the name of this entity
    - entity.risk.calculated_score_norm (0-100) - the normalized risk score for this entity
    - entity.risk.calculated_level (critical, high, moderate, low, unknown)
    - asset.criticality (extreme_impact, high_impact, moderate_impact, low_impact, unknown)
    - entity.attributes.watchlists - watchlists that contain this entity
    - entity.attributes.managed - whether this entity is managed
    - entity.attributes.mfa_enabled - whether MFA is enabled for this entity
    - entity.attributes.asset - whether this entity is an asset
    - entity.behaviors.rule_names - detection rules associated with this entity
    - entity.behaviors.anomaly_job_ids - anomaly detection jobs that have detected this entity
    - entity.source - multi-value list of integration/data sources that produced this entity (e.g. crowdstrike, endgame, okta, island_browser). Always lowercase integration keys.
    - entity.lifecycle.first_seen - first time this entity has been seen in the entity store
    - entity.lifecycle.last_activity - last time this entity has been active in the entity store
    - risk_score_inputs - the alert inputs that contributed to the risk score calculation for this entity.
    - profile_history - historical snapshot profiles for this entity over a specified time interval
    This tool may return multiple results if an exact match for the entity ID is not found.
    If multiple results are returned:
      - Provide a summary of the FIRST result.
      - You MUST mention the other results found and provide the COMPLETE entity ID for each

#### Inline rendering (REQUIRED when a single entity is resolved)
When \`security.get_entity\` resolves exactly one entity, it also stores a \`security.entity\` attachment
and returns an \`other\` result containing \`attachmentId\` and \`version\`. You MUST render that
attachment inline using the custom XML element, on its own line, followed by a BLANK LINE, and then
your prose summary:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

    <your prose summary here>

Rules:
- Copy \`id\` and \`version\` verbatim from the tool result. Do not invent or alter them.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the rich entity card first.
- ALWAYS insert a BLANK LINE between the \`<render_attachment>\` tag and any following prose. Without this blank line, the prose will be dropped by the markdown parser.
- Render each \`security.entity\` attachment at most once per turn.
- When multiple results are returned (fallback match), no attachment is stored — skip the render tag and summarise in prose.

### Search Entities Tool
- \`security.search_entities\` - Search the entity store for security entities (host, user, service, generic) matching specific criteria.
    Use this tool to find entities based on:
    - normalized risk score range (0-100)
    - risk level (critical, high, moderate, low, unknown)
    - asset criticality level (extreme_impact, high_impact, moderate_impact, low_impact, unknown)
    - entity attributes (watchlists, managed status, MFA status, asset)
    - entity behaviors (behavior rule names, anomaly job IDs)
    - entity lifecycle timestamps (first seen, last activity)
    - data source (entity.source) - pass the raw integration key(s) via the \`sources\` parameter; e.g. \`sources: ['crowdstrike']\`. Use the stored lowercase key, not a pretty-printed label (so pass \`island_browser\`, not \`Island Browser\`).
    Do NOT use this tool if the entity ID (EUID) is known; use the \`security.get_entity\` tool instead.
    ALWAYS use real entities from the entity store, do not invent entities.
    ALWAYS use the \`security.get_entity\` after using this tool to get the full profile for each entity found.

#### Inline rendering (REQUIRED when 2+ entities are returned)
When \`security.search_entities\` returns 2 or more entities, it also stores an aggregate
\`security.entity\` attachment and returns an \`other\` result containing \`attachmentId\` and
\`version\`. You MUST render that attachment inline using the custom XML element, on its own
line, followed by a BLANK LINE, and then your prose summary:

    <render_attachment id="ATTACHMENT_ID" version="VERSION" />

    <your prose summary here>

Rules:
- Copy \`id\` and \`version\` verbatim from the \`other\` tool result. Do not invent or alter them.
- Emit the \`<render_attachment>\` tag BEFORE your prose summary so the user sees the table first.
- ALWAYS insert a BLANK LINE between the \`<render_attachment>\` tag and any following prose. Without this blank line, the prose will be dropped by the markdown parser.
- Render each \`security.entity\` attachment at most once per turn.
- The rendered table REPLACES the prose markdown table for the list — do not also print the
  markdown columns described in Step 3 when the inline table is shown. A short narrative
  (top-level takeaways, outliers worth flagging) still belongs in the prose.
- When exactly one entity is returned, the attachment uses the single-entity id scheme and a
  follow-up \`security.get_entity\` for the same entity bumps the same version rather than
  creating a new pill. Prefer letting \`get_entity\` emit the render tag (richer card) in that
  flow and skip the render tag on the \`search_entities\` result itself.

## Entity Analysis Investigation Steps

### 1. Find entities to investigate
- If entity ID (EUID) is known, continue directly to the next step
- If not, use \`security.search_entities\` to find entities. Always use real entities from the entity store, do not invent entities.
- You MUST call \`security.search_entities\` with a 'riskScoreMin' parameter if the user is asking about risk scores or riskiness.
- You MUST call \`security.search_entities\` with a 'criticalityLevels' parameter if the user is asking about criticality.
- ONLY call \`security.search_entities\` with a 'riskScoreChangeInterval' parameter if the user is asking about changes or jumps in risk score.

### 2. Get entity profiles
How aggressively you call \`security.get_entity\` depends on how many entities step 1 produced:

- **2+ entities returned** — prefer the inline table rendered from the aggregate
  \`security.entity\` attachment (see "Inline rendering" above). Do NOT loop
  \`security.get_entity\` over every row just to populate the table: the aggregate attachment is
  already sufficient for the user to drill in. Only call \`security.get_entity\` when the user
  explicitly asks for per-entity profiles, risk score inputs, behavior history, or anomaly
  details, or when the investigation narrative clearly requires enrichment for a specific
  entity you are calling out in the prose.
- **Exactly 1 entity returned** — still call \`security.get_entity\` to pull the enriched
  profile (risk inputs, history, behaviors). The single-entity attachment id is deterministic,
  so \`get_entity\` bumps the existing attachment's version instead of creating a duplicate.
- **Entity ID already known (step 1 skipped)** — call \`security.get_entity\` directly.

General guidance when you do call \`security.get_entity\`:

- Identify if any time interval or specific date is needed for historical analysis
- Use \`security.get_entity\` to get the full entity profile, including risk score inputs
- If more than one profile is returned for an entity, order them chronologically to build a picture of entity behavior over time

### 3. Interpret and summarize output
- For \`security.get_entity\` tool results, summarize the current profile and identify whether the entity is considered risky
- If the result contains 'risk_score_inputs', summarize the alerts that contributed to the risk score calculation
- If the result contains 'profile_history', summarize the history of this entity over time, which may include:
  - Whether the risk score has increased or decreased over time
  - Whether the entity asset criticality has become more or less critical over time
  - Whether the entity has been added to or removed from watchlists over time
  - Whether the entity has exhibited new behaviors or stopped exhibiting certain behaviors over time
- For \`security.search_entities\` tool results, summarize results in a table format. The table MUST have the following columns if data is available for them:
  - risk score
  - asset criticality
  - first_seen
  - last_seen
  Include columns for behavioral attributes if data exists and column is relevant to the user's prompt

### 4. Provide recommendation
- Recommend investigating external activities for user entities
- Recommend investigating vulnerabilities and exposures for host and service entities

## Entity Analytics dashboard snapshot (Canvas UI)

When the user **explicitly** asked to open the **Entity Analytics home/overview** product experience in chat — same information architecture as Security → Entity Analytics home: **entity risk levels** with donut + breakdown table, **recent anomalies / highlights**, and **entities** — **not** when their ask is only **which entities are riskiest** / **top N** / **list entities** (those are satisfied by the automatic \`security.entity\` attachment from \`security.search_entities\`):

1. Use \`security.search_entities\` (and \`security.get_entity\` as needed) so the snapshot reflects **real** entity store data aligned with the user's filters (entity types, risk, criticality, watchlists, time hints in the question).
2. Call \`attachments.add\` with \`type\` set to exactly \`security.entity_analytics_dashboard\` and \`data\` containing:
   - \`attachmentLabel\`: short title tailored to the request (for example, "High-risk users — last 7 days").
   - \`summary\` (optional): 1–3 sentences interpreting the snapshot for this question.
   - \`time_range_label\` (optional): plain language (for example, "Last 24 hours", "Last 90 days") when the user implied a window.
   - \`watchlist_id\` / \`watchlist_name\` (optional): when the user or your filters scoped a watchlist (copy from tool/API output when present).
   - \`severity_count\` (optional but recommended): object \`{ "Critical", "High", "Moderate", "Low", "Unknown" }\` with **non-negative integer** counts. Prefer counts that match the environment when you can infer them reliably from tool outputs. If you only have a **sample** (for example entities returned by \`security.search_entities\`), **bucket those rows by \`risk_level\`**, set the counts from that sample, and set \`distribution_note\` to state clearly that counts reflect that sample (for example, "Counts are from the 50 entities returned for this question, not a full-environment rollup").
   - \`anomaly_highlights\` (optional): array of \`{ "title", "body"? }\` for the right-hand panel — summarize notable risk changes, criticality, watchlist membership, or detection-driven signals **derived from the tools** (this replaces live ML anomaly charts when those are not available).
   - \`entities\`: array of row objects \`{ entity_type, entity_id, entity_name?, source?, risk_score_norm?, risk_level?, criticality?, first_seen?, last_activity? }\`. Order by the importance you describe in prose. May be empty only when the user asked purely for KPI-style framing and you still supply \`severity_count\` and/or highlights.
3. In your **markdown message**, on its own line, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from that tool result (**Mandatory — \`<render_attachment>\`** above).
4. The UI shows an **inline** pill and **Preview → Canvas** with the same two-column **risk / highlights** layout as the product home page — **only** with the tag from step 3.
5. Still write a concise narrative in the message; use the attachment for the structured dashboard view and deep investigation via **Open Entity Analytics in Security**.
6. If the underlying \`security.search_entities\` also emitted an aggregate \`security.entity\` attachment (2+ entities), you may render **both** tags in the same turn — the entities table and the dashboard snapshot are complementary.

## Examples

### Example 1: Riskiest Users

User query: Which users have the highest risk scores?

Steps:
1. Use \`security.search_entities\` to get the top N users sorted by their normalized risk scores. When 2+ users are returned the tool emits an aggregate \`security.entity\` attachment.
2. Optionally use \`security.get_entity\` for specific rows when you need richer context for prose callouts.
3. Render the aggregate \`security.entity\` attachment inline by emitting \`<render_attachment id="..." version="..." />\` from the \`search_entities\` \`other\` result — the renderer shows the entities table Canvas.
4. Write a short narrative calling out the highest-risk users, biggest criticality gaps, and suggested follow-ups.

### Example 2: Risk Score Changes Over Time

User query: Who has had the biggest increase in risk score over the last 90 days?

Steps:
1. Use \`security.search_entities\` with a riskScoreChangeInterval of '90d' to find entities with risk score changes.
2. Analyze the results and identify which entities have had significant (greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} score change) increases in risk score.
3. For each entity with significant risk score change, use \`security.get_entity\` with an interval of '90d' to get their full profile history.
4. Render the aggregate \`security.entity\` attachment from \`search_entities\` (entities table in Canvas) and summarize in prose the previous vs current risk scores, the magnitude of change, and the drivers.

### Example 3: High Impact Assets

User query: What are the riskiest hosts in my environment that are high impact?

Steps:
1. Use \`security.search_entities\` to get the top N hosts sorted by their normalized risk scores, using parameter \`criticalityLevels: ['high_impact', 'extreme_impact']\` to filter for high impact.
2. Render the aggregate \`security.entity\` attachment from \`search_entities\` so the user gets the entities table Canvas.
3. Summarize in prose the riskiest hosts and why their criticality matters.

### Example 4: Risk Score History

User query: Has Cielo39's risk score changed significantly?

Steps:
1. Use \`security.get_entity\` with an interval of '30d' to fetch Cielo39's current profile and profile_history for the last 30 days.
2. Render the single-entity \`security.entity\` attachment from \`get_entity\` so the user sees the entity card.
3. Analyze the risk scores in the profile history along with the current risk score to determine if the change in risk score is significant (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points).
4. Summarize the trends in risk score changes (stable, increasing, decreasing) in prose.

### Example 5: Entities From a Specific Data Source

User query: Can I get all hosts coming from Crowdstrike?

Steps:
1. Use \`security.search_entities\` with \`entityTypes: ['host']\` and \`sources: ['crowdstrike']\` to find hosts whose \`entity.source\` includes the Crowdstrike integration. The \`sources\` value MUST be the raw lowercase integration key as stored in the entity store (e.g. \`crowdstrike\`, \`endgame\`, \`okta\`, \`island_browser\`) — never the pretty-printed label rendered in the UI.
2. When 2+ entities are returned, render the inline aggregate \`security.entity\` attachment (see "Inline rendering" rules) instead of repeating the markdown table.
3. In the prose, name the data source the user filtered on (e.g. "9 hosts are sourced from Crowdstrike") and call out the riskiest entries the user may want to investigate.

### Example 6: Single-entity card for the riskiest host

User query: Show me the entity card for the most risky host.

Steps:
1. Use \`security.search_entities\` with \`entityTypes: ["host"]\`, sort implicitly by risk (tool returns highest risk first), and \`maxResults: 1\`.
2. Use \`security.get_entity\` for that host's EUID — this emits a single-entity \`security.entity\` attachment that renders as the entity card.
3. Emit \`<render_attachment id="..." version="..." />\` from \`get_entity\`'s \`other\` result. (Skip the render tag on the \`search_entities\` result; the deterministic attachment id means \`get_entity\` bumps the same pill with the richer card payload.)
4. Summarize in prose why this host is the riskiest among hosts in scope.

### Example 7: "Details / profile" vs "List / compare" wording

- User: "**Details** on the riskiest host", "**more about** that host", "**profile** / **deep dive** for this user" → treat like Example 6: one winner, \`security.get_entity\` emits the single-entity card. Render the tag from \`get_entity\`.
- User: "**List** the **five** riskiest hosts", "**compare** these hosts", "**who are** the riskiest users", "**show** risky **hosts**" → \`security.search_entities\` with matching \`maxResults\`; the tool emits the aggregate \`security.entity\` attachment (entities table) when 2+ rows are returned. Render the tag from \`search_entities\`.

### Example 8: List question with only one matching entity

User query: List all critical-risk hosts in my tenant (filters are strict and only **one** host matches).

Steps:
1. Use \`security.search_entities\` with the requested filters. Because only one entity is returned, the aggregate attachment id collapses to the single-entity id scheme.
2. Use \`security.get_entity\` for that single host — this bumps the same attachment's version with the richer card payload.
3. Render \`<render_attachment id="..." version="..." />\` from the \`get_entity\` result (the single-entity card is the correct Canvas for a one-row list).

### Example 9: "Riskiest entities in the system" (generic plural)

User query: Show the riskiest entities in the system.

Steps:
1. Use \`security.search_entities\` with \`entityTypes\` spanning the kinds you will rank (e.g. \`["host","user","service"]\`) or aligned with the user's scope, \`maxResults\` per investigation norms, ordered by risk.
2. Render the aggregate \`security.entity\` attachment (entities table Canvas) by emitting \`<render_attachment id="..." version="..." />\` from the \`search_entities\` \`other\` result. **Do not** add \`security.entity_analytics_dashboard\` — the user did **not** ask to open the **Entity Analytics home/overview** page by name.
3. In prose, highlight the top riskiest entities and recommend follow-ups.

### Example 10: Riskiest hosts **and** users (multi-type, one message)

User query: Show me the most riskiest hosts and users in my system.

Steps:
1. Use \`security.search_entities\` with \`entityTypes: ["host", "user"]\` (or run one call per type when the user wants explicit parity) and a \`riskScoreMin\` parameter (per investigation rules for riskiness questions — use \`0\` when no numeric cutoff was given), and \`maxResults\` for how many rows to show.
2. Render the aggregate \`security.entity\` attachment emitted by \`search_entities\` — the entities table Canvas handles the mixed host/user list.
3. In prose, summarize the highest-risk entities of each type.

### Example 11: Entity Analytics dashboard / home page

User query: Show me the Entity Analytics dashboard.

Steps:
1. Use \`security.search_entities\` to gather a representative sample of entities (and optionally \`security.get_entity\` for highlights you want to call out).
2. Call \`attachments.add\` with \`type\` \`security.entity_analytics_dashboard\` and populate \`severity_count\`, \`anomaly_highlights\`, and \`entities\` from the tool outputs (see "Entity Analytics dashboard snapshot").
3. Emit \`<render_attachment id="..." version="..." />\` from the \`attachments.add\` tool result so the user sees the dashboard Canvas.
4. You may **also** render the aggregate \`security.entity\` tag from \`search_entities\` in the same turn — the entities table and the dashboard snapshot are complementary views.

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Provide the criticality level of the entity if available, otherwise report as "unknown"
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- An entity is considered risky if its normalized score is above 80
- Higher scores indicate greater risk to the organization
- A change in risk score greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points over an interval is considered significant
- An entity is considered high impact if its criticality level is "high_impact" or "extreme_impact"
- Data source values (\`entity.source\`) are lowercase integration keys (e.g. \`crowdstrike\`, \`island_browser\`). The inline table renders them title-cased for display, but you MUST always filter using the raw key when calling \`security.search_entities\`.
- Document your analysis process and reasoning clearly
- Avoid listing noisy raw data; highlight the most relevant signals
- Offer a short explanation of why a risk score is considered high or low
- Suggest next steps if needed, for example:
  - Investigate relevant alerts contributing to risk score
  - Investigate external activities and movement for risky user entities
  - Investigating vulnerabilities and exposures for risky host and service entities

## Response formats

### Top N entities
Provide a short table with the key fields:

| Entity | Type | Risk score (0-100) | Risk level | Criticality |
| --- | --- | --- | --- | --- |
| <id_value> | <entity_type> | <calculated_score_norm> | <calculated_level> | <criticality_level or "unknown"> |

Then add 1-2 bullets with key observations (e.g., highest criticality, biggest score gap, which entities to investigate further).
`;

const legacyContent = `
## When to Use This Skill

Use this skill when:
- A user asks to find the riskiest entities (hosts, users, services, generic) in their environment
- A user wants to understand whether any entities have had a significant change in risk score
- You want to look up the asset criticality level for an entity

## Entity Analysis Process

### 1. Find the risky entities
- Use the 'security.entity_analytics.risk_score' tool to find the riskiest entities based on their normalized risk scores (0-100)
- These entities will be sorted by their normalized risk score (calculated_score_norm) in descending order
- When entity ID is provided and no results are found, you must call the tool again with another entity type to find the entity (e.g. if "john" is not found as a user entity, try finding "john" as a host or service entity type)

### 2. Analyze risk score changes over time
- Use the 'security.entity_analytics.risk_score' tool to analyze how an entity's risk score has changed over a specified time interval (e.g., last 30, 60, 90 days)
- Look for significant increases in risk score (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points) to identify entities that may require further investigation

### 3. Retrieve asset criticality levels
- Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality level for a specific entity
- If no entity ID is provided, retrieve the most critical assets in the environment sorted by their criticality level

## Examples

### Example 1: Riskiest Users

User query: Which users have the highest risk scores?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool to get the top N users sorted by their normalized risk scores.
2. Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality levels for these users
3. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level

### Example 2: Risk Score Changes Over Time

User query: Who has had the biggest increase in risk score over the last 90 days?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool with a time interval of '90d' to find entities with risk score increases.
2. Present the findings in a table format showing entity ID, previous risk score, current risk score, and risk score change.

### Example 3: High Impact Assets

User query: What are the riskiest hosts in my environment that are high impact?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool to get the top N hosts sorted by their normalized risk scores.
2. Use the 'security.entity_analytics.asset_criticality' tool to get the asset criticality levels for these hosts
3. Filter the results to only show hosts that have a criticality level of "high_impact" or "extreme_impact"
4. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level


### Example 4: Risk Score History

User query: Has Cielo39's risk score changed significantly?

Steps:
1. Use the 'security.entity_analytics.risk_score' tool with a time interval of '30d' to analyze Cielo39's risk score changes with host entityType
2. When no results are returned, use the 'security.entity_analytics.risk_score' tool again to analyze Cielo39's risk score changes with user entityType
3. When no results are returned, use the 'security.entity_analytics.risk_score' tool again to analyze Cielo39's risk score changes with service entityType
4. When results are returned, determine if the change in risk score is significant (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points).
5. Present the findings in a concise format showing the previous risk score, current risk score, and whether the change is significant.

## Important dependencies
- Risk score questions require the **Risk Engine** to be enabled and risk indices to exist.
- Asset criticality questions require asset criticality data to be ingested into the entity analytics asset criticality index.

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Provide the criticality level of the entity if available, otherwise report as "unknown"
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- An entity is considered risky if its normalized score is above 80
- Higher scores indicate greater risk to the organization
- A change in risk score greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points over an interval is considered significant
- Document your analysis process and reasoning clearly
- Avoid listing noisy raw data; highlight the most relevant signals
- Offer a short explanation of why the score is considered high or low
- Suggest next steps if needed (e.g., investigate the most relevant alerts)

## Response formats

### Top N entities
Provide a short table with the key fields:

| Entity | Type | Risk score (0-100) | Risk level | Criticality |
| --- | --- | --- | --- | --- |
| <id_value> | <entity_type> | <calculated_score_norm> | <calculated_level> | <criticality_level or "unknown"> |

Then add 1-2 bullets with key observations (e.g., highest criticality, biggest score gap, which entities to investigate further).`;

export const getEntityAnalyticsSkill = (ctx: EntityAnalyticsSkillsContext) =>
  defineSkillType({
    id: 'entity-analytics',
    name: 'entity-analytics',
    basePath: 'skills/security/entities',
    description:
      'Security entity investigations (hosts, users, services, generic): entity store search/get_entity, risk and criticality. ' +
      'Rich attachments: `security.entity` (emitted automatically by search_entities/get_entity — renders as a single-entity card for 1 entity and as an entities table for 2+ entities); `security.entity_analytics_dashboard` (explicit attachments.add — only when the user asks to show/open/view the Entity Analytics home/overview product page). After each tool result that emits a rich attachment, output `<render_attachment id=… version=… />` in markdown (required for Preview/Canvas UI). ' +
      'Risk history, alert contributions, watchlists, behaviors, discovering risky entities.',
    content: `
# Entity Analysis Guide

${ctx.isEntityStoreV2Enabled ? entityStoreV2Content : legacyContent}
`,
    getInlineTools: () =>
      ctx.isEntityStoreV2Enabled
        ? []
        : FF_DYNAMICALLY_GENERATE_ESQL
        ? [getRiskScoreEsqlTool(ctx), getAssetCriticalityEsqlTool(ctx)]
        : [getRiskScoreInlineTool(ctx), getAssetCriticalityInlineTool(ctx)],
    getRegistryTools: () =>
      ctx.isEntityStoreV2Enabled
        ? [SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID]
        : [],
  });
