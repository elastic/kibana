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
import {
  SECURITY_GET_ENTITY_TOOL_ID,
  SECURITY_GET_ENTITY_GRAPH_TOOL_ID,
  SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
  SECURITY_SEARCH_ENTITIES_TOOL_ID,
  SECURITY_LIST_WATCHLISTS_TOOL_ID,
  SECURITY_SET_ASSET_CRITICALITY_TOOL_ID,
} from '../../tools';

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

// The "Inline rendering" sections below follow a strict copy-verbatim
// contract: the entity tools (security.get_entity / security.search_entities)
// embed a pre-formatted `renderTag` string in their `ToolResultType.other`
// payload (see `buildRenderAttachmentTag` in
// server/agent_builder/tools/entity_analytics/entity_attachment_utils.ts)
// and the skill instructs the model to paste that exact string onto its own
// line. We do NOT ask the model to assemble a `<render_attachment>` tag from
// `attachmentId` / `version` any more — doing so has empirically produced
// hallucinated ids (e.g. `security.entity:single:<email>`) which contain
// `@` / `.` and shatter the upstream HTML tokenizer in
// remark-parse-no-trim (its openTag regex rejects underscores, and the
// autolink / email inline tokenizers run before the HTML tokenizer so any
// URL-shaped substring breaks the tag into multiple AST nodes). The skill
// also keeps the "blank line between <render_attachment> and prose" rule
// as a second line of defense; removing it depends on a platform-side
// fix to `createTagParser`
// (x-pack/platform/plugins/shared/agent_builder/public/application/components/
// conversations/conversation_rounds/round_response/markdown_plugins/utils.ts)
// that is out of scope for this plugin.
const entityStoreV2Content = `
This skill investigates security entities (hosts, users, services, generic) — surfacing profiles, risk scores, criticality, watchlists, relationship graphs, and risk-score history, and composing the Entity Analytics dashboard snapshot.

## Attachment contract

Each tool that emits a rich attachment already explains the verbatim-copy rule in its description. Key points:

- **\`security.entity\`** — emitted automatically by \`security.get_entity\` (single-entity card) and \`security.search_entities\` (entities table for 2+ results). Copy the \`renderTag\` from the tool's \`other\` result **verbatim** onto its own line before prose.
- **\`security.entity_risk_score_history\`** — emitted automatically by \`security.get_entity_risk_score_history\`. Same verbatim-copy rule.
- **\`security.entity_graph\`** — emitted automatically by \`security.get_entity_graph\`. Same verbatim-copy rule.
- **\`security.entity_analytics_dashboard\`** — you call \`attachments.add\` explicitly; assemble the tag from the result's \`id\` and \`current_version\`: \`<render_attachment id="<id>" version="<current_version>" />\`

**No \`renderTag\` in the result → no tag in your reply.** If the result lists multiple candidates (\`candidateEntityIds\`), write prose only and ask the user to pick the exact EUID. Otherwise follow the tool's error/message — do not invent a tag. (Exception: \`security.entity_analytics_dashboard\` — assemble the tag from \`attachments.add\`'s \`id\` / \`current_version\` as above.)

**Always insert a blank line** between a \`<render_attachment>\` tag and any following prose — without it the prose is dropped by the markdown parser.

**Never duplicate attachment contents in prose.** The Canvas IS the user-facing view. Write only narrative alongside it: trend, outliers, and recommended next steps.

## Routing

| Intent | Typical phrases | Tool |
| --- | --- | --- |
| Single entity profile / card / flyout | "details", "profile", "deep dive", "tell me about **this** host", "the riskiest host" (one winner) | \`security.get_entity\` |
| List / rank / compare entities | "list", "top N", "riskiest users", "who are", "show risky hosts", "compare hosts and users" | \`security.search_entities\` |
| Risk score over time | "trend", "history", "has the score changed", "why did it spike", "chart" | \`security.get_entity_risk_score_history\` |
| Entity relationship graph | "graph", "how is this entity connected", "visualize relationships" | \`security.get_entity_graph\` |
| Entity Analytics product page | "Entity Analytics dashboard/home/overview/landing", "show/open/view Entity Analytics" | \`security.search_entities\` → \`attachments.add\` |

**Graph vs. card** — "graph" / "connected" / "relationships" → \`security.get_entity_graph\`. "Details" / "profile" → \`security.get_entity\`. Do not substitute one for the other.

**Single-entity card vs. entities table** — the renderer selects automatically based on how many entities the \`security.entity\` attachment holds.

**Dashboard trigger** — when the user's prompt contains any of: **entity analytics dashboard**, **EA dashboard**, **entity analytics home/overview/landing**, or **show / open / view / display / bring up Entity Analytics** (the product page, not a generic Kibana dashboard): gather entity data with \`security.search_entities\`, then call \`attachments.add\` with \`type: 'security.entity_analytics_dashboard'\`, and render both the entities table tag and the dashboard tag in the same turn. This rule takes precedence over list/ranking-only framing — if the product-page phrase is present, emit the dashboard. Does NOT apply when the user asks only for the riskiest / top-N entities without naming the Entity Analytics page.

## Investigation pattern

### 1. Find entities
- EUID known → call \`security.get_entity\` directly.
- EUID unknown → \`security.search_entities\` with the user's filters. Always use real entities from the entity store; never invent entities.
- Omit \`riskScoreMin\` unless the user named a numeric floor — the tool sorts by risk score descending by default, excluding entities with no score. Pass \`sortBy: 'criticality'\` when unscored entities must appear alongside scored ones.
- \`criticalityLevels\` **filters** (restricts to specific tiers). \`sortBy: 'criticality'\` **ranks** across all tiers (extreme → high → medium → low, risk score as tiebreaker). Do NOT stuff all four levels into \`criticalityLevels\` to simulate a sort — it is a no-op and the tool will sort by risk score instead. The two parameters compose: \`criticalityLevels\` + \`sortBy: 'criticality'\` restricts AND orders.
- Only pass \`riskScoreChangeInterval\` when the user asks about score changes over an interval.

### 2. Get profiles
- **2+ entities from search** — the aggregate attachment is sufficient. Do NOT loop \`security.get_entity\` over every row. Only call it for specific entities when the narrative requires per-entity enrichment.
- **Exactly 1 entity from search** — call \`security.get_entity\`; it bumps the attachment to the richer card payload. Skip the \`search_entities\` renderTag to avoid a duplicate pill.
- **EUID already known** — call \`security.get_entity\` directly.

### 3. Interpret output

**Single entity** — 1–3 prose sentences: is the entity risky, what drives the score, what to investigate next. Do NOT produce a field-by-field markdown block — the card shows those fields.
- \`risk_score_inputs\`: one sentence on the top contributing alert(s).
- \`anomalies\`: 1–2 bullets on MITRE ATT&CK tactics.
- \`vulnerabilities\`: 1–2 bullets on CVE IDs and severity.
- \`profile_history\`: entity-store **attribute** snapshots (criticality, watchlists, behaviors over time — not the risk score series). One sentence on any significant attribute change. For risk score trends, use \`security.get_entity_risk_score_history\` instead.

**Multiple entities** — 2–4 prose bullets: top scorers, criticality gaps, outliers, recommended follow-ups. Do NOT re-list every row as markdown columns — the entities table Canvas already shows them.

**Risk score history** — the tool's \`other\` result contains \`entries\` (peak score per histogram bucket), \`bucketInterval\`, and optionally per-entry contributions. Use \`entries\` to reason about trend direction, peak score, and whether the change exceeds ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points (significant). Keep prose to 1–3 sentences — do not dump all data points as a markdown table; the chart attachment shows the series.

### 4. Risk score grounding

Check \`riskScoreGrounding.status\` in the tool's \`other\` result:
- **\`started\`** — scoring is current; say nothing.
- **\`stopped\`** — caveat results using \`lastScoreTimeAgo\`; suggest re-enabling entity analytics.
- **\`never_started\`** — say risk data is unavailable; suggest enabling entity analytics.

### 5. Recommend next steps
- User entities → external activities and lateral movement.
- Host / service entities → vulnerabilities and exposures.

## Vendor source lookup

When the user names a vendor, use these raw lowercase keys for \`namespaces\` and/or \`sources\`:

| Vendor | \`namespaces\` | \`sources\` |
| --- | --- | --- |
| AWS | \`['aws']\` | \`['aws']\` |
| Okta | \`['okta']\` | \`['okta', 'entityanalytics_okta']\` |
| Azure AD / Entra ID | \`['entra_id']\` | \`['azure', 'entityanalytics_entra_id']\` |
| Microsoft 365 | \`['microsoft_365']\` | \`['o365', 'o365_metrics']\` |
| Active Directory | \`['active_directory']\` | \`['entityanalytics_ad']\` |
| Endpoint / local | \`['local']\` | \`['endpoint', 'system']\` |
| CrowdStrike | — | \`['crowdstrike']\` |
| Google Workspace | — | \`['google_workspace']\` |
| Jamf | — | \`['jamf', 'jamf_protect']\` |

A single vendor key in \`sources\` covers all dataset variants via exact-or-prefix matching (e.g. \`['aws']\` matches \`aws.cloudtrail\`, \`aws.guardduty\`, etc.) — do not fan out. For unlisted vendors try \`namespaces: ['<event.module>']\` on user entities or \`sources: ['<lowercase key>']\`.

**Which parameter to use:**
1. User entity + vendor has a canonical namespace → try \`namespaces\` first (single-valued, most reliable).
2. Zero results → retry with \`sources\` prefix key.
3. No canonical namespace, or host/service/generic entity → skip \`namespaces\`, use \`sources\` directly.
4. Both return zero → report "no matching entities"; do not invent.

## Dashboard snapshot (attachments.add)

When the dashboard trigger fires:
1. Call \`security.search_entities\` (and optionally \`security.get_entity\`) to gather real entity data.
2. Call \`attachments.add\` with \`type: 'security.entity_analytics_dashboard'\` and \`data\`:
   - \`attachmentLabel\` — short title tailored to the request.
   - \`severity_count\` (recommended) — \`{ Critical, High, Moderate, Low, Unknown }\` with non-negative integer counts bucketed from tool output. If only a sample is available, set \`distribution_note\` stating so.
   - \`anomaly_highlights\` (optional) — array of \`{ title, body? }\` for notable signals derived from tool output.
   - \`entities\` — array of \`{ entity_type, entity_id, entity_name?, source?, risk_score_norm?, risk_level?, criticality?, first_seen?, last_seen? }\`, ordered by importance. Use \`@timestamp\` as \`last_seen\` (always present — \`entity.lifecycle.last_activity\` can be absent for fresh entities).
   - \`time_range_label\` — only when the user named an explicit time window. Never use generic filler ("Current", "Now", "Today", "All time").
   - \`summary\` (optional) — 1–3 sentences interpreting the snapshot.
   - \`watchlist_id\` / \`watchlist_name\` (optional) — when the user's filters scoped a watchlist.
3. Assemble the render tag from \`id\` and \`current_version\` in the \`attachments.add\` result:

   \`<render_attachment id="<id from attachments.add>" version="<current_version from attachments.add>" />\`

   Copy those two values byte-for-byte from the tool result. Never invent an id, never derive it from \`attachmentLabel\` or entity names. \`attachments.add\` does NOT return a \`renderTag\` — do not try to copy one.
4. Render both the entities table tag (from \`search_entities\` \`renderTag\`) and the dashboard tag in the same turn. Rendering only the entities table while claiming it is the Entity Analytics dashboard is incorrect.

## Related Skills

When investigating anomalous behavior, use \`~/skills/security/ml/find-security-ml-jobs\` to find the ML jobs that answer the user's question. That skill returns EUIDs of entities with anomalous behavior — pass those to \`security.get_entity\`.

## Examples

### Example 1: Riskiest users

User: Which users have the highest risk scores?

1. \`security.search_entities\` with \`entityTypes: ['user']\` (no \`riskScoreMin\` — tool sorts by score descending). When 2+ results, the tool emits the aggregate \`security.entity\` attachment.
2. Render the \`renderTag\` verbatim from \`search_entities\` \`other\` result.
3. 2–4 prose bullets: top scorers, criticality gaps, suggested follow-ups.

### Example 2: Biggest risk score increase over a period

User: Who has had the biggest increase in risk score over the last 90 days?

1. \`security.search_entities\` with \`riskScoreChangeInterval: '90d'\` to rank by score delta. Identify entities with change > ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points.
2. Render the \`renderTag\`. Summarize previous vs current scores and magnitude of change.
3. Optionally follow up with \`security.get_entity_risk_score_history\` for the top entity's chart.

### Example 3: Criticality filter vs. criticality rank

User: What are the riskiest high-impact hosts? / List the top 5 entities by criticality.

**By criticality filter** ("high-impact hosts"): \`security.search_entities\` with \`entityTypes: ['host']\`, \`criticalityLevels: ['high_impact', 'extreme_impact']\`.

**By criticality rank** ("top 5 by criticality"): \`security.search_entities\` with \`sortBy: 'criticality'\`, \`maxResults: 5\`. Do NOT pass \`criticalityLevels\` — the user asked for a ranking across all tiers, not a filter.

Render the \`renderTag\`. Summarize the top tier(s) and recommend follow-ups.

### Example 4: Risk score history

User: Has Cielo39's risk score changed significantly?

1. \`security.get_entity_risk_score_history\` for Cielo39, \`from: 'now-30d'\`, \`to: 'now'\`.
2. Render the \`renderTag\` verbatim from the tool result.
3. Use \`entries\` and \`bucketInterval\` from the result to determine trend direction and whether the change exceeds ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points (entries are peak-per-bucket, not every scoring run).
4. 1–3 prose sentences: trend, significance, what to investigate next. Do not dump all data points.

### Example 5: Single-entity card vs. entities table vs. graph

**Card** ("details on the riskiest host", "profile for this user"):
1. \`security.search_entities\` with \`maxResults: 1\` for the relevant type.
2. \`security.get_entity\` for that EUID — emits the richer card. Skip the \`search_entities\` renderTag (avoid duplicate pill).
3. Render the \`renderTag\` from \`get_entity\`. 1–3 prose sentences on why this entity leads.

**Table** ("list the five riskiest hosts", "who are the riskiest users"):
1. \`security.search_entities\` with the relevant filters and \`maxResults\`.
2. Render the \`renderTag\` from \`search_entities\`. 2–4 prose bullets.

**Graph** ("show the graph for host web-01", "how is user jdoe connected"):
1. \`security.get_entity_graph\` with the entity's EUID.
2. Render the \`renderTag\`. 1–3 prose sentences on what the graph shows and what to investigate next. Do not restate nodes/edges. If multiple candidates are returned (no \`renderTag\`), ask the user to pick the exact EUID.

### Example 6: Vendor-scoped entities

User: Who are my riskiest Okta users? / Can I get all hosts from CrowdStrike?

**Okta users** (canonical namespace exists): \`security.search_entities\` with \`entityTypes: ['user']\`, \`namespaces: ['okta']\`. If zero results, retry with \`sources: ['okta', 'entityanalytics_okta']\`.

**CrowdStrike hosts** (no canonical namespace; host has no entity.namespace): \`security.search_entities\` with \`entityTypes: ['host']\`, \`sources: ['crowdstrike']\`.

Render the \`renderTag\`. Name the vendor in prose ("9 CrowdStrike hosts...").

### Example 7: Watchlist members

User: Who is on the Privileged Users watchlist?

1. \`security.list_watchlists\` with \`nameContains: 'Privileged Users'\` to resolve to a watchlist \`id\`. If no match, retry with a shorter token.
2. \`security.search_entities\` with \`watchlists: [<id>]\`.
3. Render the \`renderTag\`. 2–4 prose bullets on riskiest members and recommended follow-ups.

### Example 8: Entity Analytics dashboard

User: Show me the Entity Analytics dashboard.

1. \`security.search_entities\` to gather a representative entity sample.
2. \`attachments.add\` with \`type: 'security.entity_analytics_dashboard'\`, populated from tool output (see "Dashboard snapshot" above).
3. Render the dashboard tag (from \`attachments.add\` \`id\`/\`current_version\`) AND the entities table tag (from \`search_entities\` \`renderTag\`) in the same turn.
4. 2–4 prose sentences interpreting the snapshot.

## Best Practices
- Report risk scores using \`calculated_score_norm\` (0–100). Scores above 80 are risky.
- A score change > ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points is significant. An entity is high impact if criticality is \`high_impact\` or \`extreme_impact\`.
- \`entity.source\` values are lowercase integration keys — always filter with the raw key, never the display label. A single prefix key covers dataset variants (\`['aws']\` covers \`aws.cloudtrail\`, etc.).
- \`entity.namespace\` (normalized vendor namespace) exists only on user entities. Prefer \`namespaces\` over \`sources\` for user queries when a canonical value exists; fall back to \`sources\` when the namespace search returns zero rows or the vendor has no canonical namespace.
- When unscored entities must appear alongside scored ones, use \`sortBy: 'criticality'\` — the default \`riskScore\` sort excludes entities with no score.
- Highlight the most relevant signals; avoid dumping raw data. Suggest next steps.
`;

const legacyContent = `
## When to Use This Skill

Use this skill when:
- A user asks to find the riskiest entities (hosts, users, services, generic) in their environment
- A user wants to understand whether any entities have had a significant change in risk score
- You want to look up the asset criticality level for an entity

## Related Skills
When asked to investigate unusual or anomalous behavior by entities, use:
- '~/skills/security/ml/find-security-ml-jobs' to find the appropriate ML jobs that will answer the user's question

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
      'Security entity investigations (hosts, users, services, generic): entity store search/get_entity, get_entity_risk_score_history (risk-over-time chart), list watchlists (discover watchlist names/ids and find members), risk and criticality. ' +
      'Rich attachments: `security.entity` (emitted automatically by search_entities/get_entity — renders as a single-entity card for 1 entity and as an entities table for 2+ entities); `security.entity_risk_score_history` (emitted by get_entity_risk_score_history); `security.entity_analytics_dashboard` (explicit attachments.add — only when the user asks to show/open/view the Entity Analytics home/overview product page). After each tool result that emits a rich attachment, paste its `renderTag` verbatim in markdown (required for Preview/Canvas UI). ' +
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
        ? [
            SECURITY_GET_ENTITY_TOOL_ID,
            SECURITY_GET_ENTITY_GRAPH_TOOL_ID,
            SECURITY_GET_ENTITY_RISK_SCORE_HISTORY_TOOL_ID,
            SECURITY_SEARCH_ENTITIES_TOOL_ID,
            SECURITY_LIST_WATCHLISTS_TOOL_ID,
            SECURITY_SET_ASSET_CRITICALITY_TOOL_ID,
          ]
        : [],
  });
