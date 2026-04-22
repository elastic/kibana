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

const entityStoreV2Content = `
## Choosing the right \`attachments.add\` type (entity card vs entity list vs dashboard)

Three different rich UIs exist. The user’s **words** decide \`type\` — not how many rows your search happened to return.

| What the user wants | Typical phrases | \`attachments.add\` \`type\` | Canvas / UI pattern |
| --- | --- | --- | --- |
| **One entity** — **details**, **profile**, **deep dive**, **card**, **flyout-style** summary, “everything about **this** host/user”, **the** riskiest **host** (singular), **tell me about** … | entity card, card, details, detail, profile, flyout, drill down, investigate this one, summarize **this** entity, **the** top / #1 host or user | \`security.entity_card\` | **Entity card** (flyout-shaped sections: summary, risk, resolution, insights). **Not** the wide **entities table** list. |
| **Several entities** in a **table** to scan or compare | list, table, top 5, top N, which hosts/users, rank, compare, who are the riskiest (**many**), enumerate | \`security.entity_list\` | **Entity list** — **multi-row table** in Canvas. Payload needs **≥2** rows in \`data.entities\`; one row is **invalid** — use \`security.entity_card\` instead. |
| **Entity Analytics home** layout (donut, highlights, entities together) | Entity Analytics dashboard, home, overview page, same layout as Entity Analytics | \`security.entity_analytics_dashboard\` | **Dashboard snapshot** Canvas (risk breakdown + highlights + table). |

**Mandatory disambiguation before \`attachments.add\`**
1. Count the **primary deliverable**: one EUID → **card** path; two or more EUIDs the user cares about as a set → **list** path (if ≥2 rows).
2. If the user said **details**, **detail**, **more about**, **profile**, **card**, or **flyout** for **one** entity → **\`security.entity_card\`** after \`security.get_entity\`, **never** \`security.entity_list\` as the main rich attachment (wrong table UI; list also rejects a single row).
3. If you only need **one** winner from search (e.g. “the riskiest host”), set \`security.search_entities\` \`maxResults\`: **1**, then **\`security.entity_card\`**. If search returned extra rows, pick **one** winner for the card; mention others in **prose only** — do **not** attach a list “for context” when they asked for **details** / **card** for one entity.

## Critical rule — single winner or explicit entity card (overrides entity list)

Applies when the **Choosing** table above says \`security.entity_card\`: one primary EUID, or explicit **card** / **details** / **profile** / **flyout** language for that entity (including “**the** riskiest **host**”, “**the** highest-risk **user**”).

- Call \`security.search_entities\` with \`maxResults\`: **1** and correct \`entityTypes\` when discovery must yield a single winner unless the user clearly asked for several entities.
- Call \`security.get_entity\` for that EUID, then \`attachments.add\` with \`type\` exactly \`security.entity_card\` (see **Rich single-entity card**). **Do not** use \`security.entity_list\` for this answer — wrong Canvas. \`security.entity_list\` **rejects** fewer than two \`entities\` rows.
- If search returned **multiple** rows, still follow **Choosing** step 3: one \`security.entity_card\` for the winner, no list attachment for singular intent.

This rule **outranks** the “ranked / multi-entity” block when intent is **one** entity or **details/card/profile** for one entity, even if wording includes “riskiest” or “highest risk”.

## Critical rule — Entity Analytics "dashboard" / home / overview

This section applies **only** when the user clearly wants the **Security → Entity Analytics home / dashboard experience** in Canvas: e.g. they name **Entity Analytics dashboard** or **home**, ask for an **overview like the Entity Analytics page**, **risk level breakdown / donut**, **highlights panel plus entities table together**, or **the same layout as Entity Analytics**.

It does **not** apply to generic requests for a **list**, **ranking**, **top N**, or **who are the riskiest entities** — those use **Rich entity list attachment** below (plus markdown); the dashboard rule does not replace that.

When this dashboard rule **does** apply:

- You **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_analytics_dashboard\` in the **same turn** after you have entity data from \`security.search_entities\` (and optionally \`security.get_entity\`). The conversation UI only shows that **dashboard-shaped** Canvas when this attachment exists; prose or \`security.entity_list\` alone does **not** render that dashboard layout.
- You **MUST NOT** satisfy **that** dashboard-shaped request using only \`security.entity_list\` or only markdown — use \`security.entity_analytics_dashboard\` for the two-column home-style Canvas.
- Populate \`entities\` from tool output: copying rows from \`security.search_entities\` is acceptable for the dashboard snapshot when calling \`security.get_entity\` for every row would be impractical; add \`get_entity\` when you need richer fields for highlights or accuracy.

## Critical rule — ranked / multi-entity answers (list, top, riskiest)

When the user asks for the **riskiest**, **highest-risk**, **top N**, **most risky**, or **a list of** entities (any phrasing where the main deliverable is **multiple entities ranked or tabulated** — plural, “which”, “who are”, “show me the top 5”, **not** “the riskiest host” / “entity card” / the single-winner rule above), and you return **two or more** entities from \`security.search_entities\`:

- After \`security.get_entity\` for those entities, you **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_list\` (see **Rich entity list attachment**). Do **not** answer with only a markdown table — the user expects the **Entity list** pill and **Preview → Canvas** table in the conversation UI.
- Use \`security.entity_analytics_dashboard\` **in addition** only if they also asked for the EA **home / dashboard** experience as in the block above; otherwise \`security.entity_list\` is the required rich attachment for multi-entity lists.

This skill provides a guide to investigating specific security entities (hosts, users, services, generic) by entity ID (EUID)
or by surfacing risky entities based on their risk scores, asset criticality levels and other behavioral and lifecycle attributes.

## When to Use This Skill

Use this skill when:
- The user asks about the **Entity Analytics dashboard**, **Entity Analytics home / overview**, or wants a view **like the built-in Entity Analytics page** (risk levels, anomalies-style context, entities table) scoped to their question → \`security.entity_analytics_dashboard\` when that is the main ask (see **Choosing** table).
- They want **one entity’s details / card / profile / flyout-style** view (by EUID or by “the riskiest host” etc.) → follow **Choosing** + **Rich single-entity card** (\`security.entity_card\`).
- They want a **multi-entity table** (compare, rank, top N with N≥2, “which hosts…”) → follow **Choosing** + **Rich entity list attachment** (\`security.entity_list\` with ≥2 rows).
- Investigating the current behavior of a specific entity using its ID (EUID)
- Looking up the current profile for a specific entity using its ID (EUID), including risk score, asset criticality and watchlists
- Analyzing the historical behavior of a specific entity using its ID (EUID)
- Analyzing changes in an entity's risk score or behavior over time
- Discovering the riskiest entities in the environment based on risk scores and criticality levels
- Surfacing entities that require further investigation based on their attributes and behaviors

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
    - entity.lifecycle.first_seen - first time this entity has been seen in the entity store
    - entity.lifecycle.last_activity - last time this entity has been active in the entity store
    - risk_score_inputs - the alert inputs that contributed to the risk score calculation for this entity.
    - profile_history - historical snapshot profiles for this entity over a specified time interval
    This tool may return multiple results if an exact match for the entity ID is not found.
    If multiple results are returned:
      - Provide a summary of the FIRST result.
      - You MUST mention the other results found and provide the COMPLETE entity ID for each

### Search Entities Tool
- \`security.search_entities\` - Search the entity store for security entities (host, user, service, generic) matching specific criteria.
    Use this tool to find entities based on:
    - normalized risk score range (0-100)
    - risk level (critical, high, moderate, low, unknown)
    - asset criticality level (extreme_impact, high_impact, moderate_impact, low_impact, unknown)
    - entity attributes (watchlists, managed status, MFA status, asset)
    - entity behaviors (behavior rule names, anomaly job IDs)
    - entity lifecycle timestamps (first seen, last activity)
    Do NOT use this tool if the entity ID (EUID) is known; use the \`security.get_entity\` tool instead.
    ALWAYS use real entities from the entity store, do not invent entities.
    ALWAYS use the \`security.get_entity\` after using this tool to get the full profile for each entity found.

## Entity Analysis Investigation Steps

### 1. Find entities to investigate
- If entity ID (EUID) is known, continue directly to the next step
- If not, use \`security.search_entities\` to find entities. Always use real entities from the entity store, do not invent entities.
- You MUST call \`security.search_entities\` with a 'riskScoreMin' parameter if the user is asking about risk scores or riskiness.
- You MUST call \`security.search_entities\` with a 'criticalityLevels' parameter if the user is asking about criticality.
- ONLY call \`security.search_entities\` with a 'riskScoreChangeInterval' parameter if the user is asking about changes or jumps in risk score.

### 2. Get entity profiles
For each entity ID, you MUST call \`security.get_entity\` get the full entity profile

- Identify if any time interval or specific date is needed for historical analysis
- Use \`security.get_entity\` to get the full entity profile, including risk score inputs
- If more than one profile is returned for an entity, order them chronologically to build a picture of entity behavior over time

You MUST use the \`security.get_entity\` tool to get entity profiles for EACH entity found in step 1. For example,
if 10 entities are found using \`security.search_entities\`, you MUST call \`security.get_entity\` 10 times to get the full profiles for each entity.

### 3. Interpret and summarize output
- **Pick \`attachments.add\` \`type\`** using the **Choosing** section before you add anything: **details / card / profile / one entity** → \`security.entity_card\`; **two or more entities as the main table** → \`security.entity_list\`; **EA home-style page** → \`security.entity_analytics_dashboard\`. Do not substitute a **list** attachment when the user asked for **entity details** or a **card** — they are different UIs in the product.
- For \`security.get_entity\` tool results, summarize the current profile and identify whether the entity is considered risky
- If the result contains 'risk_score_inputs', summarize the alerts that contributed to the risk score calculation
- If the result contains 'profile_history', summarize the history of this entity over time, which may include:
  - Whether the risk score has increased or decreased over time
  - Whether the entity asset criticality has become more or less critical over time
  - Whether the entity has been added to or removed from watchlists over time
  - Whether the entity has exhibited new behaviors or stopped exhibiting certain behaviors over time
- For \`security.search_entities\` with **two or more** entities **and** the user wants a **list/table/compare** deliverable (see **Choosing**), you **MUST** add \`security.entity_list\` (see "Rich entity list attachment") after \`security.get_entity\` — a markdown-only table is **not** sufficient. For **one** primary entity, or any **details/card/profile** ask, use \`security.entity_card\` (see "Rich single-entity card"), or prose without a list attachment — **not** \`security.entity_list\`. **Exception:** if the user asked for the **Entity Analytics dashboard / home / overview UI** (see that **dashboard** critical rule above), use \`security.entity_analytics_dashboard\` as the primary rich UI; you may still add \`security.entity_list\` only if you have **two or more** entities for that separate list. The entity list table MUST have the following columns if data is available for them:
  - risk score
  - asset criticality
  - first_seen
  - last_seen
  Include columns for behavioral attributes if data exists and column is relevant to the user's prompt

## Rich single-entity card (Canvas UI)

Use \`security.entity_card\` when the user wants **entity details** or the **card** experience for **one** EUID — **not** the multi-entity **list** table. When the investigation is about **one primary entity** (single EUID) and you have called \`security.get_entity\` for it:
1. Call \`attachments.add\` with \`type\` set to exactly \`security.entity_card\`.
2. Populate \`data\` at minimum with \`entity_type\` and \`entity_id\`. Map the tool response and your analysis into optional fields:
   - Identity: \`entity_name\`, \`attachmentLabel\` (short card title).
   - Flyout-aligned summary: \`data_source\`, \`watchlist_names\` (string array), \`criticality\` (use the same criticality keys as in Security, e.g. \`high_impact\`), \`first_seen\`, \`last_activity\`.
   - Extra attributes: \`field_rows\` as an array of \`{ "label", "value" }\` for any other notable scalar fields you want to highlight.
   - **Risk summary**: \`risk_score_norm\`, \`risk_level\`, \`risk_note\` (your synthesis), and \`risk_inputs\` as an array of \`{ "title", "detail"?, "alert_count"? }\` mirroring risk inputs / contributing alerts from the tool output.
   - **Resolution** (entity resolution workflow): \`resolution\` object with optional \`headline\`, \`status\`, and \`items\` as \`{ "label", "value" }\` rows (for example match status, same-as links, or merge notes when present in the API).
   - **Insights**: \`insights\` as an array of \`{ "title", "body"?, "emphasis"?: "info" | "warning" | "danger" }\` for behavioral or posture highlights (similar in purpose to the Insights area of the entity flyout).
3. The UI shows a compact **inline** card and a **Preview → Canvas** layout (same interaction pattern as dashboard attachments) with sections for summary, fields, risk, resolution, and insights.
4. Still write a short natural-language summary in the message; use the card for structured detail and deep links.
5. The existing \`security.entity\` attachment type remains for minimal identifier payloads from the product UI — use \`security.entity_card\` when you want to render a full investigated-entity view for the user.

## Rich entity list attachment (Canvas UI)

Use \`security.entity_list\` only for a **multi-entity table** in Canvas (scan, sort, compare **several** EUIDs). It is **not** the attachment for “show me **details**” or “**entity card**” for one host/user. When your answer depends on **two or more entities** (and the **Choosing** table says list, not card) and you have already fetched their profiles with \`security.get_entity\`:
1. Call the \`attachments.add\` tool with \`type\` set to exactly \`security.entity_list\`.
2. Set \`data\` to a JSON object with:
   - \`attachmentLabel\`: a short title for the list (for example, "Highest-risk users — last 7 days").
   - \`entities\`: an array with one entry per entity. Each entry MUST include \`entity_type\` (\`host\`, \`user\`, \`service\`, or \`generic\`) and \`entity_id\` (the EUID). Copy optional fields from the \`security.get_entity\` / \`security.search_entities\` payloads when present: \`entity_name\`, \`source\`, \`risk_score_norm\`, \`risk_level\`, \`criticality\`, \`first_seen\`, \`last_activity\`.
3. Order \`entities\` in the same priority you describe in prose (for example, highest \`risk_score_norm\` first).
4. The Security UI renders this attachment like dashboard attachments: a compact inline summary with a **Preview** action that opens a full **Canvas** table (aligned with the Entity Analytics entities list columns).
5. Still write a concise narrative summary in the message body; use the attachment for the detailed multi-entity view.
6. For a **single** entity, do **not** use \`security.entity_list\`; use \`security.entity_card\` (above) when a rich card is helpful, otherwise answer in text or rely on an existing \`security.entity\` attachment when the user attached one.
7. If the user asked for the **Entity Analytics dashboard / home / overview**, do **not** use \`security.entity_list\` as the primary rich UI — use \`security.entity_analytics_dashboard\` (see below).

## Entity Analytics dashboard snapshot (Canvas UI)

When the user wants the **Entity Analytics dashboard experience** (same information architecture as Security → Entity Analytics home: **entity risk levels** with donut + breakdown table, **recent anomalies / highlights**, and **entities**), not just a flat list or a single-entity card:

1. Use \`security.search_entities\` (and \`security.get_entity\` as needed) so the snapshot reflects **real** entity store data aligned with the user’s filters (entity types, risk, criticality, watchlists, time hints in the question).
2. Call \`attachments.add\` with \`type\` set to exactly \`security.entity_analytics_dashboard\`.
3. Populate \`data\` with:
   - \`attachmentLabel\`: short title tailored to the request (for example, "High-risk users — last 7 days").
   - \`summary\` (optional): 1–3 sentences interpreting the snapshot for this question.
   - \`time_range_label\` (optional): plain language (for example, "Last 24 hours", "Last 90 days") when the user implied a window.
   - \`watchlist_id\` / \`watchlist_name\` (optional): when the user or your filters scoped a watchlist (copy from tool/API output when present).
   - \`severity_count\` (optional but recommended): object \`{ "Critical", "High", "Moderate", "Low", "Unknown" }\` with **non-negative integer** counts. Prefer counts that match the environment when you can infer them reliably from tool outputs. If you only have a **sample** (for example entities returned by \`security.search_entities\`), **bucket those rows by \`risk_level\`**, set the counts from that sample, and set \`distribution_note\` to state clearly that counts reflect that sample (for example, "Counts are from the 50 entities returned for this question, not a full-environment rollup").
   - \`anomaly_highlights\` (optional): array of \`{ "title", "body"? }\` for the right-hand panel — summarize notable risk changes, criticality, watchlist membership, or detection-driven signals **derived from the tools** (this replaces live ML anomaly charts when those are not available).
   - \`entities\`: same rows as \`security.entity_list\` (array of \`entity_type\`, \`entity_id\`, plus optional fields from \`security.get_entity\`). Order by the importance you describe in prose. May be empty only when the user asked purely for KPI-style framing and you still supply \`severity_count\` and/or highlights.
4. The UI shows an **inline** pill and **Preview → Canvas** with the same two-column **risk / highlights** layout as the product home page (above a full **entities** table). It is **more precise** than generic prose because you choose columns, counts, highlights, and ordering for the user’s request.
5. Still write a concise narrative in the message; use the attachment for the structured dashboard view and deep investigation via **Open Entity Analytics in Security**.

### 4. Provide recommendation
- Recommend investigating external activities for user entities
- Recommend investigating vulnerabilities and exposures for host and service entities

## Examples

### Example 1: Riskiest Users

User query: Which users have the highest risk scores?

Steps:
1. Use the 'security.search_entities' tool to get the top N users sorted by their normalized risk scores.
2. For each user, use the 'security.get_entity' tool to get their full profile. If 10 entities are returned, you MUST call the 'security.get_entity' tool 10 times to get each user's profile.
3. Call \`attachments.add\` with \`type\` \`security.entity_list\` and populate \`entities\` from the profiles (see "Rich entity list attachment").
4. Present the results in a table format in the message as well, showing entity ID, risk score, risk level, asset criticality level and any watchlists they belong to.

### Example 2: Risk Score Changes Over Time

User query: Who has had the biggest increase in risk score over the last 90 days?

Steps:
1. Use the 'security.search_entities' tool with a riskScoreChangeInterval of '90d' to find entities with risk score changes.
2. Analyze the results and identify which entities have had significant (greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} score change)
   increases in risk score.
3. For each entity with significant risk score change, use the 'security.get_entity' tool with an interval of '90d' to get their full profile history.
4. Present the findings in a table format showing entity ID, previous risk score, current risk score, risk score change, and a summary of how their risk score has changed over the interval.

### Example 3: High Impact Assets

User query: What are the riskiest hosts in my environment that are high impact?

Steps:
1. Use the 'security.search_entities' tool to get the top N hosts sorted by their normalized risk scores, using parameter
criticalityLevels: ['high_impact', 'extreme_impact'] to filter for high impact.
2. For each host returned, use \`security.get_entity\`, then call \`attachments.add\` with \`type\` \`security.entity_list\` when there are two or more hosts.
3. Present the results in a table format showing entity ID, risk score, risk level, and asset criticality level

### Example 4: Risk Score History

User query: Has Cielo39's risk score changed significantly?

Steps:
1. Use the 'security.get_entity' tool with an interval of '30d' to fetch Cielo39's current profile and profile_history for the last 30 days
2. Analyze the risk scores in the profile history along with the current risk score to determine if the change in risk score is significant (e.g., greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points).
3. Summarize the trends in risk score changes (stable, increasing, decreasing) and present findings in a concise format showing the previous risk scores, current risk score, and whether the change is significant.

### Example 5: Entity card for the single riskiest host

User query: Show me the entity card for the most risky host.

Steps:
1. Use \`security.search_entities\` with \`entityTypes\`: \`["host"]\`, sort implicitly by risk (tool returns highest risk first), and \`maxResults\`: **1**.
2. Use \`security.get_entity\` for that host’s EUID.
3. Call \`attachments.add\` with \`type\` \`security.entity_card\` (not \`security.entity_list\`) and populate \`data\` from the profile (see **Rich single-entity card**). \`security.entity_list\` is the wrong Canvas for this question and cannot carry a single row anyway.
4. Summarize in prose why this host is the riskiest among hosts in scope.

### Example 6: “Details / profile” vs “List / compare” wording

- User: “**Details** on the riskiest host”, “**more about** that host”, “**profile** / **deep dive** for this user” → treat like Example 5: one winner, \`security.entity_card\` after \`security.get_entity\`. **Never** \`security.entity_list\` for that intent.

- User: “**List** the **five** riskiest hosts”, “**compare** these hosts”, “**who are** the riskiest users” (many) → \`security.search_entities\` with matching \`maxResults\`, \`security.get_entity\` per row, then \`security.entity_list\` with **at least two** entities in \`data.entities\`.

## Best Practices
- Always use \`calculated_score_norm\` (0-100) when reporting risk scores
- Provide the criticality level of the entity if available, otherwise report as "unknown"
- Risk levels: Critical (highest), High, Moderate, Low, Unknown
- An entity is considered risky if its normalized score is above 80
- Higher scores indicate greater risk to the organization
- A change in risk score greater than ${ENTITY_RISK_SCORE_SIGNIFICANT_CHANGE_THRESHOLD} points over an interval is considered significant
- An entity is considered high impact if its criticality level is "high_impact" or "extreme_impact"
- Document your analysis process and reasoning clearly
- Avoid listing noisy raw data; highlight the most relevant signals
- Offer a short explanation of why a risk score is considered high or low
- Suggest next steps if needed, for example:
  - Investigate relevant alerts contributing to risk score
  - Investigate external activities and movement for risky user entities
  - Investigating vulnerabilities and exposures for risky host and service entities

## Response formats

### Top N entities
When N ≥ 2, you **MUST** call \`attachments.add\` with \`security.entity_list\` (after \`security.get_entity\` for each row). Then in the message body provide a short table with the key fields:

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
    description: `Guide to finding and investigating security entities (hosts, users, services, generic).
      Rich UI: security.entity_card for one-entity details/card/flyout-style Canvas; security.entity_list only for two or more entities in a table; security.entity_analytics_dashboard for Entity Analytics home-style overview (see skill "Choosing" table).
      Includes the Entity Analytics dashboard / home overview: use the security.entity_analytics_dashboard attachment so the user gets Preview→Canvas with risk breakdown, highlights, and entities (see skill content).
      Analyze how an entity's risk score, criticality, behaviors and attributes have changed over time (e.g. last 90 days).
      Analyze how alerts contribute to an entity's risk score.
      Discover risky entities based on risk score, risk level, criticality level, watchlists, access behaviors, privilege attributes.`,
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
