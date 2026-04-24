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
## Mandatory first — when you **must** call \`attachments.add\` with \`security.entity_list\`

**Before you end the turn**, if **both** are true: (a) you ran \`security.search_entities\` and will present **one or more** real entities from the store in prose or a table, and (b) the user asked for a **ranking**, **list**, **top N**, **which/who**, **show** plural (**entities**, **hosts**, **users**, **services**), **compare**, **in the system**/**environment**, **riskiest**/**highest risk**/**most risky**/**dangerous** identities, or otherwise **set-of-entities** intent — then you **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_list\` (after \`security.get_entity\` for each included row). **Stopping after markdown or after only \`security.entity_analytics_dashboard\` in that situation is incorrect** unless the user **explicitly** asked only to open the **Entity Analytics home/overview** product page (they said **Entity Analytics** + **home/overview/dashboard/page** intent), **and** they did **not** ask for a ranked list of **which** entities.

**Heuristic:** If the user would reasonably expect an **Entity list** pill / **entities table** Canvas for this answer, you need \`security.entity_list\`. Questions such as **"show the riskiest entities in the system"** always expect that pill — **always** add \`security.entity_list\`.

**Anti-pattern:** Do **not** choose \`security.entity_analytics_dashboard\` because the topic feels "like Entity Analytics" or because the answer mentions risk levels. The dashboard attachment is **only** for **open/show the Entity Analytics home/overview UI** requests, **plus** optional companion use when list rules also require \`security.entity_list\`.

## Mandatory — \`<render_attachment>\` (otherwise there is **no** Preview / Canvas)

Rich types \`security.entity_list\`, \`security.entity_card\`, and \`security.entity_analytics_dashboard\` **do not** show the interactive pill, **Preview**, or **Canvas** unless you **embed** them in your **assistant markdown** in the **same turn**.

**Immediately after** each successful \`attachments.add\` for one of those types, add its own line in your reply (copy \`attachment_id\` and \`version\` **exactly** from that tool result’s \`data\`):

\`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\`

Example (values come from the tool): \`<render_attachment id="att-abc123" version="1" />\`

- **One** \`<render_attachment>\` per attachment you added (if you added list + dashboard, output **two** tags with each id/version pair).
- **Without** this tag, the UI only shows subdued italic text like **Attachment added: …** — the user **cannot** open the entities table Canvas. **That is incorrect** for these attachment types.

## Choosing the right \`attachments.add\` type (entity card vs entity list vs dashboard)

Three different rich UIs exist. Choose by what the user **meant** (list vs particular entity), **not** only by how many rows matched.

**Hard requirement — multiple entities → always \`security.entity_list\`**
Whenever the user is asking about **multiple entities** (several identities, **two+** EUIDs, **hosts and users**, **these/those** entities, **compare** entities, **top N** with **N ≥ 2**, or any wording where **more than one** concrete entity from the store is the subject), you **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_list\` and put **every** entity you are presenting in \`data.entities\` (**one** \`attachments.add\` call with **all** rows). **Do not** answer using **only** \`security.entity_analytics_dashboard\`, **only** markdown, or **only** multiple \`security.entity_card\` calls for that ask. If they **also** qualify for the EA home snapshot (\`security.entity_analytics_dashboard\`), you **still** add \`security.entity_list\` when **two or more** entities are in scope — the dashboard attachment is **not** a substitute for the entity list attachment in that situation. The **only** exception is **single-EUID** intent (details / **one** entity / **entity card** for **that** identity without multi-entity framing) → \`security.entity_card\`.

**Explicit — generic “entities” rankings:** Phrases like **riskiest entities**, **top entities**, **entities in the system**/**environment**, **which entities**, or **show/list entities** (generic plural — **not** naming the **Entity Analytics** **page/home/overview** to open) are **list/ranking** asks. When you return **two or more** rows, the **Hard requirement** applies. When you return **one** row, you **still** use \`security.entity_list\` (list intent). **Never** satisfy these with **only** \`security.entity_analytics_dashboard\` unless the user **clearly** asked for that **product page** in Canvas.

**Precedence — Security Entity Analytics page vs Kibana “dashboard”**
- If they mean the **built-in Security → Entity Analytics** experience (same IA as the product **Entity Analytics** page): phrases like **show / open / view / display / bring up** the **Entity Analytics** **dashboard**, **home**, **overview**, or **landing** page → **always** \`security.entity_analytics_dashboard\` **first** when you add a rich attachment for that ask. This is a **snapshot of that product page** in chat Canvas — **not** composing a **new Kibana saved Dashboard** (Lens panels, \`dashboard-management\` skill). Do **not** wait for the user to say “create”; **show/open/view** that page is enough.
- **Does not** apply when the user only says **show**/**tell me**/**what are** together with **risky**/**riskiest**/**top** **hosts**, **users**, **entities** (generic plural: identities to rank or enumerate), etc. **without** naming the **Entity Analytics** product page — those are **list/ranking** asks → \`security.entity_list\` (see below), not the dashboard snapshot.
- **Generic plural “entities”** (**riskiest entities**, **top entities**, **entities in the system**, **which entities**) asks **who/what to list or rank**. Unless they **explicitly** want the **Entity Analytics home/overview page** opened in chat, that is **list intent** → \`security.entity_list\` when you surface **any** matching rows — **not** \`security.entity_analytics_dashboard\` **alone**.
- Only use Kibana dashboard composition when they clearly want a **new or edited Kibana Dashboard** saved object (panels, Lens, \`manage_dashboard\`, etc.) — not merely the word “dashboard” next to “Entity Analytics”.

| What the user wants | Typical phrases | \`attachments.add\` \`type\` | Canvas / UI pattern |
| --- | --- | --- | --- |
| **Particular / singular** entity — **not** asking for a plural **list** | **this** host, named EUID, **details**, **detail**, **profile**, **deep dive**, **entity card**, **card**, **flyout**, “everything about **that** user”, **tell me about** one entity, **the** riskiest **host** when they mean **one** winner (not “show me **hosts**…”) | \`security.entity_card\` | **Entity card** — flyout-shaped sections (summary, risk, resolution, insights). |
| **List / set / table** of entities — **plural or ranking** framing (even if search returns **only one** row) | **list**, **table**, **show**/**which**/**who are** **hosts**/**users**/**entities** (plural entity nouns), **top** N, **rank**, **compare**, **enumerate**, “**entities** that…”, “**hosts** sorted by risk”, **compound asks** naming **two+ entity kinds** in one question (**hosts and users**, **users or services**, **hosts, users, and services**) | \`security.entity_list\` | **Entity list** — entities **table** in Canvas. \`data.entities\` may contain **one or more** rows; **use this type whenever the user asked for a list**, including a single-row result. **Not** for “show the **Entity Analytics** dashboard/home” — that row is \`security.entity_analytics_dashboard\` (see precedence above). |
| **Entity Analytics home** layout (donut, highlights, entities together) | Entity Analytics dashboard, home, overview page, same layout as Entity Analytics; **show/open/view** Entity Analytics (dashboard/home) | \`security.entity_analytics_dashboard\` | **Dashboard snapshot** Canvas. |

**Mandatory disambiguation before \`attachments.add\`**
0. **Entity Analytics product page** (built-in Security Entity Analytics **dashboard / home / overview** — including **show/open/view** **that** page / **the Entity Analytics UI** / **same layout as Entity Analytics**) → **\`security.entity_analytics_dashboard\`** after \`security.search_entities\` (and \`security.get_entity\` when needed). **Do not** satisfy with \`security.entity_list\` alone; **do not** use the **dashboard-management** skill for this. **This is not** triggered by generic **“show me multiple entities”**, **“show these hosts/users”**, **“list the top N”**, or **“hosts and users”** ranking asks — those are **list intent** (step 1 → \`security.entity_list\`) unless they **explicitly** want the **Entity Analytics home/overview experience** by name or clear product-page wording.
1. **List intent** (they want a **set** of **entities** to scan, sort, or compare — plural / table / ranking language aimed at **hosts/users/services/entities**, including **show**/**see**/**give me** **multiple**/**several** entities, **two or more** types in one question, or **these**/**those** entities) → **\`security.entity_list\`**. Populate \`entities\` with **every** row you are returning (**1 row is OK** — still the list/table Canvas).
2. **Particular-entity intent** (they care about **one** identity, or **details/card/profile** for that one, and they are **not** framing it as a list of entities) → **\`security.entity_card\`** after \`security.get_entity\` for that EUID. **Do not** use the list attachment here — wrong UI pattern.
3. If both could apply, prefer **list** when they explicitly asked for a **list** or **table** of **entities**, **ranking**/**top**/**riskiest**/**which**/**who**/**show** plural identities, or **entities in the system** — **\`security.entity_list\`**; prefer **card** when they asked for **details** / **card** / **this entity** without list framing; prefer **\`security.entity_analytics_dashboard\`** **only** when step 0 applies because they asked to **show/open/view** the **Entity Analytics** **home/overview/dashboard** **product page** (naming that experience), **not** because they used the word **entities** in a ranking question. If the answer involves **two or more** concrete entities from the store, apply the **Hard requirement** — **always** \`security.entity_list\` regardless of step 0.

## Critical rule — particular entity or entity card (not the entities list)

Applies when the **Choosing** table says \`security.entity_card\`: one primary EUID the user cares about as **that** entity, or **details** / **profile** / **entity card** / **flyout** language **without** list-of-entities framing.

- Call \`security.search_entities\` with appropriate \`maxResults\` (often **1** when only one winner matters) and correct \`entityTypes\` when you must discover the EUID.
- Call \`security.get_entity\` for that EUID, then \`attachments.add\` with \`type\` exactly \`security.entity_card\` (see **Rich single-entity card**). **Do not** use \`security.entity_list\` — that is the **table** Canvas, not the flyout-style **card**.

This rule applies when the user is **not** meaning a plural **list** of entities, even if the topic is “riskiest” or “highest risk.”

## Critical rule — Entity Analytics "dashboard" / home / overview

This section applies when the user wants the **Security → Entity Analytics home / dashboard experience** in Canvas — including **show**, **open**, **view**, or **walk me through** that **built-in** page (not “build me a new Kibana Dashboard”). Typical triggers: **Entity Analytics dashboard** / **home** / **overview**, **show Entity Analytics**, **entity analytics landing page**, **risk level breakdown / donut**, **highlights panel plus entities table together**, **same layout as Entity Analytics** **when they mean open that product screen**. **Not a trigger:** **riskiest**/**top**/**which**/**list** **entities** (or **hosts**/**users**) **in the system** — that is **\`security.entity_list\`** per **Mandatory first**, even if an answer could superficially resemble parts of the EA page.

It does **not** apply to generic requests for a **list**, **ranking**, **top N**, or **who are the riskiest entities** framed only as **which hosts/users**/**entities** — those use **Rich entity list attachment** below (plus markdown); the dashboard rule does not replace that. If they want **both** the EA home layout **and** you present **two or more** concrete entities, use \`security.entity_analytics_dashboard\` **and** you **MUST** also add \`security.entity_list\` with **all** those entities (**Hard requirement** above) — never rely on the dashboard snapshot alone for a multi-entity list answer.

When this dashboard rule **does** apply:

- You **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_analytics_dashboard\` in the **same turn** after you have entity data from \`security.search_entities\` (and optionally \`security.get_entity\`). The conversation UI only shows that **dashboard-shaped** Canvas when this attachment exists; prose or \`security.entity_list\` alone does **not** render that dashboard layout.
- You **MUST NOT** satisfy **that** dashboard-shaped request using only \`security.entity_list\` or only markdown — use \`security.entity_analytics_dashboard\` for the two-column home-style Canvas.
- If you are simultaneously presenting **multiple entities** (see **Hard requirement**), you **MUST** also add \`security.entity_list\` in that same turn; the dashboard’s own \`entities\` field does **not** count as fulfilling the entity-list attachment requirement.
- Populate \`entities\` from tool output: copying rows from \`security.search_entities\` is acceptable for the dashboard snapshot when calling \`security.get_entity\` for every row would be impractical; add \`get_entity\` when you need richer fields for highlights or accuracy.

## Critical rule — multiple entity types or “hosts and users” in one question

When a single user message asks for **more than one entity category** (e.g. **riskiest hosts and users**, **top hosts and services**, **users or entities** meaning several kinds) or otherwise clearly wants **multiple entities** to review (not **one** EUID and not **only** the EA **product page**):

- Treat this as **list intent** → **\`security.entity_list\`** is **mandatory** whenever you return **any** concrete entities from the store. **Do not** answer with **only** markdown tables, and **do not** use **only** \`security.entity_card\` (e.g. one card for “top host” and one for “top user”) unless the user explicitly asked for **cards**/**details** for **those specific** entities **without** list/table framing.
- Run \`security.search_entities\` **per requested type** when types are explicit (e.g. \`entityTypes: ["host"]\` and \`entityTypes: ["user"]\` with aligned \`maxResults\` / risk filters), **or** one search with multiple \`entityTypes\` when a **single blended ranking** matches their wording. Call \`security.get_entity\` for **every** row you include, then **one** \`attachments.add\` with \`type\` \`security.entity_list\` whose \`data.entities\` contains **all** rows (hosts and users together). Use \`attachmentLabel\` to reflect the mix (e.g. “Highest-risk hosts and users”).
- If they **also** asked for the **Entity Analytics home/dashboard** experience by name, add \`security.entity_analytics_dashboard\` per the dashboard rule; **still** add \`security.entity_list\` when they wanted a **ranked set** of hosts/users/etc.

## Critical rule — list / ranking / table of entities (entity list attachment)

When the user’s **primary** ask is a **list**, **table**, **ranking**, **top N**, **which**, **who are**, **show** (entities plural), **compare** several, or similar **set-of-entities** framing — including “riskiest **hosts**” / “high-risk **users**” — and you have **one or more** entities from \`security.search_entities\` to show:

- After \`security.get_entity\` for **each** entity you include, you **MUST** call \`attachments.add\` with \`type\` exactly \`security.entity_list\` (see **Rich entity list attachment**). Put **all** of those rows in \`data.entities\` (**even if only one row** matched — still use the list attachment so the user gets the **entities table** Canvas). Do **not** answer with only a markdown table — the user expects the **Entity list** pill and **Preview → Canvas** table.
- Use \`security.entity_analytics_dashboard\` **in addition** only if they also asked for the EA **home / dashboard** experience as in the block above; otherwise \`security.entity_list\` is the required rich attachment for list-style answers.
- **Do not** use this block when the **particular-entity / card** rule above applies (singular **details** / **card** / **this** entity without list framing).

This skill provides a guide to investigating specific security entities (hosts, users, services, generic) by entity ID (EUID)
or by surfacing risky entities based on their risk scores, asset criticality levels and other behavioral and lifecycle attributes.

## When to Use This Skill

Use this skill when:
- The user **explicitly** asks to **show**, **open**, **view**, or **walk through** the **Entity Analytics** **home**, **overview**, **landing**, or **built-in Entity Analytics dashboard** (the **product page** / same IA as Security → Entity Analytics navigation) → \`security.entity_analytics_dashboard\` when that is the main ask (see **Choosing** table). **Do not** use this bullet for generic **which entities are riskiest**, **top entities**, **list entities**, or **entities in the system** — those are **list intent** → \`security.entity_list\` (dashboard optional **only** if they **also** clearly asked for the EA **page** above). If you present **two or more** concrete entities, **also** add \`security.entity_list\` (**Hard requirement**).
- They want **one entity’s details / card / profile / flyout-style** view (particular entity, **not** list framing) → follow **Choosing** + **Rich single-entity card** (\`security.entity_card\`).
- They want a **list / table / ranking** of entities (plural or set framing) → follow **Choosing** + **Rich entity list attachment** (\`security.entity_list\`; **one or more** rows in \`data.entities\` is valid).
- One message names **several entity kinds** to compare or rank (e.g. **riskiest hosts and users**) → follow **Critical rule — multiple entity types** + **Rich entity list attachment** (\`security.entity_list\` with **all** rows in one attachment).
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
- **Pick \`attachments.add\` \`type\`** using the **Choosing** section before you add anything: **list / table / ranking / plural entities** → \`security.entity_list\` (include every row, **even a single row**); **particular entity / details / card / not list framing** → \`security.entity_card\`; **EA home-style page** → \`security.entity_analytics_dashboard\`. Do not use the **list** attachment when the user asked for a **card** or **details** for **one** entity without list language — use the **card** attachment instead.
- For \`security.get_entity\` tool results, summarize the current profile and identify whether the entity is considered risky
- If the result contains 'risk_score_inputs', summarize the alerts that contributed to the risk score calculation
- If the result contains 'profile_history', summarize the history of this entity over time, which may include:
  - Whether the risk score has increased or decreased over time
  - Whether the entity asset criticality has become more or less critical over time
  - Whether the entity has been added to or removed from watchlists over time
  - Whether the entity has exhibited new behaviors or stopped exhibiting certain behaviors over time
- For \`security.search_entities\` results when the user wants a **list/table/ranking** (see **Choosing** and **Mandatory first**), you **MUST** add \`security.entity_list\` (see "Rich entity list attachment") after \`security.get_entity\` for each included row — a markdown-only table is **not** sufficient. Include **every** entity row in \`data.entities\` (**one or many**). For a **particular** entity or **details/card/profile** without list framing, use \`security.entity_card\` (see "Rich single-entity card") — **not** \`security.entity_list\`. **Exception:** if the user **only** wanted the **Entity Analytics dashboard / home / overview product page** opened in Canvas (see **dashboard** critical rule) **and** did **not** ask for a **ranked list of which entities** (no list/table/top/riskiest/plural-identity intent), use \`security.entity_analytics_dashboard\` as the primary rich UI. If **both** the EA **page** intent **and** list/ranking intent apply, add **both** attachments; **never** skip \`security.entity_list\` when list/ranking intent applies. The entity list table MUST have the following columns if data is available for them:
  - risk score
  - asset criticality
  - first_seen
  - last_seen
  Include columns for behavioral attributes if data exists and column is relevant to the user's prompt

## Rich single-entity card (Canvas UI)

Use \`security.entity_card\` when the user wants **entity details** or the **card** experience for **one** EUID they are treating as **that** entity — **not** when they asked for a **list** of entities (even a list of one row uses \`security.entity_list\`). When the investigation is about **one primary entity** (single EUID) and you have called \`security.get_entity\` for it:
1. Call \`attachments.add\` with \`type\` set to exactly \`security.entity_card\` and \`data\` populated at minimum with \`entity_type\` and \`entity_id\`. Map the tool response and your analysis into optional fields:
   - Identity: \`entity_name\`, \`attachmentLabel\` (short card title).
   - Flyout-aligned summary: \`data_source\`, \`watchlist_names\` (string array), \`criticality\` (use the same criticality keys as in Security, e.g. \`high_impact\`), \`first_seen\`, \`last_activity\`.
   - Extra attributes: \`field_rows\` as an array of \`{ "label", "value" }\` for any other notable scalar fields you want to highlight.
   - **Risk summary**: \`risk_score_norm\`, \`risk_level\`, \`risk_note\` (your synthesis), and \`risk_inputs\` as an array of \`{ "title", "detail"?, "alert_count"? }\` mirroring risk inputs / contributing alerts from the tool output.
   - **Resolution** (entity resolution workflow): \`resolution\` object with optional \`headline\`, \`status\`, and \`items\` as \`{ "label", "value" }\` rows (for example match status, same-as links, or merge notes when present in the API).
   - **Insights**: \`insights\` as an array of \`{ "title", "body"?, "emphasis"?: "info" | "warning" | "danger" }\` for behavioral or posture highlights (similar in purpose to the Insights area of the entity flyout).
2. In your **markdown message**, on its own line, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from that tool result (**Mandatory — \`<render_attachment>\`** above).
3. The UI shows a compact **inline** card and a **Preview → Canvas** layout — **only** with the tag from step 2.
4. Still write a short natural-language summary in the message; use the card for structured detail and deep links.
5. The existing \`security.entity\` attachment type remains for minimal identifier payloads from the product UI — use \`security.entity_card\` when you want to render a full investigated-entity view for the user.

## Rich entity list attachment (Canvas UI)

Follow **Mandatory first** — if that section says you need \`security.entity_list\`, call \`attachments.add\` **before** you finish the turn. Whenever the **Hard requirement — multiple entities** applies, this attachment is **mandatory** (see above). Use \`security.entity_list\` when the user asked for a **list**, **table**, **ranking**, or **set** of entities (plural / scan-and-compare framing). The Canvas is the **entities table** — use it **even if** your search returns **only one** entity, as long as the user meant a **list** answer. It is **not** the attachment for “show me **details**” or “**entity card**” for **one particular** entity without list framing. When your answer matches **Choosing** “list” row and you have already fetched profiles with \`security.get_entity\`:
1. Call the \`attachments.add\` tool with \`type\` set to exactly \`security.entity_list\` and \`data\` containing:
   - \`attachmentLabel\`: a short title for the list (for example, "Highest-risk users — last 7 days").
   - \`entities\`: an array with one entry per entity, ordered like your prose (for example highest \`risk_score_norm\` first). Each entry MUST include \`entity_type\` (\`host\`, \`user\`, \`service\`, or \`generic\`) and \`entity_id\` (the EUID). Copy optional fields from the \`security.get_entity\` / \`security.search_entities\` payloads when present: \`entity_name\`, \`source\`, \`risk_score_norm\`, \`risk_level\`, \`criticality\`, \`first_seen\`, \`last_activity\`.
2. In your **markdown message**, on its own line, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` using \`attachment_id\` and \`version\` from **that same** \`attachments.add\` tool result (**Mandatory — \`<render_attachment>\`** above). **Do not** skip this — otherwise the user has no Preview / Canvas (only italic "Attachment added").
3. The Security UI shows the **inline** pill and **Preview → Canvas** table — **only** when step 2’s tag is present.
4. Still write a concise narrative summary in the message body; use the attachment for the detailed multi-entity view.
5. **Single row in \`entities\` is allowed** when the user asked for a **list** — still use \`security.entity_list\` so they get the table Canvas. Use \`security.entity_card\` when the user did **not** mean a list (particular entity / details / card) — see **Choosing**.
6. If the user asked for the **Entity Analytics dashboard / home / overview product page** in Canvas, you may add \`security.entity_analytics_dashboard\` **in addition to** \`security.entity_list\` when list/ranking intent applies (**Mandatory first**). **Never** treat the dashboard attachment as a substitute for \`security.entity_list\` when the user wanted **which**/**top**/**riskiest** **entities** (or other list intent). **Never** use the dashboard attachment as the **only** rich attachment for those list asks. Emit a **second** \`<render_attachment>\` for the dashboard attachment if you add it.

## Entity Analytics dashboard snapshot (Canvas UI)

When the user **explicitly** asked to open the **Entity Analytics home/overview** product experience in chat (see **dashboard** critical rule) — same information architecture as Security → Entity Analytics home: **entity risk levels** with donut + breakdown table, **recent anomalies / highlights**, and **entities** — **not** when their ask is only **which entities are riskiest** / **top N** / **list entities** (those stay **\`security.entity_list\`**; add the dashboard **only** if they **also** wanted this **page**):

1. Use \`security.search_entities\` (and \`security.get_entity\` as needed) so the snapshot reflects **real** entity store data aligned with the user’s filters (entity types, risk, criticality, watchlists, time hints in the question).
2. Call \`attachments.add\` with \`type\` set to exactly \`security.entity_analytics_dashboard\` and \`data\` containing:
   - \`attachmentLabel\`: short title tailored to the request (for example, "High-risk users — last 7 days").
   - \`summary\` (optional): 1–3 sentences interpreting the snapshot for this question.
   - \`time_range_label\` (optional): plain language (for example, "Last 24 hours", "Last 90 days") when the user implied a window.
   - \`watchlist_id\` / \`watchlist_name\` (optional): when the user or your filters scoped a watchlist (copy from tool/API output when present).
   - \`severity_count\` (optional but recommended): object \`{ "Critical", "High", "Moderate", "Low", "Unknown" }\` with **non-negative integer** counts. Prefer counts that match the environment when you can infer them reliably from tool outputs. If you only have a **sample** (for example entities returned by \`security.search_entities\`), **bucket those rows by \`risk_level\`**, set the counts from that sample, and set \`distribution_note\` to state clearly that counts reflect that sample (for example, "Counts are from the 50 entities returned for this question, not a full-environment rollup").
   - \`anomaly_highlights\` (optional): array of \`{ "title", "body"? }\` for the right-hand panel — summarize notable risk changes, criticality, watchlist membership, or detection-driven signals **derived from the tools** (this replaces live ML anomaly charts when those are not available).
   - \`entities\`: same rows as \`security.entity_list\` (array of \`entity_type\`, \`entity_id\`, plus optional fields from \`security.get_entity\`). Order by the importance you describe in prose. May be empty only when the user asked purely for KPI-style framing and you still supply \`severity_count\` and/or highlights.
3. In your **markdown message**, on its own line, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from that tool result (**Mandatory — \`<render_attachment>\`** above).
4. The UI shows an **inline** pill and **Preview → Canvas** with the same two-column **risk / highlights** layout as the product home page — **only** with the tag from step 3.
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
2. For each host returned, use \`security.get_entity\`, then call \`attachments.add\` with \`type\` \`security.entity_list\` and populate \`entities\` with **every** host row (**one or more** — list intent always uses the list attachment).
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
3. Call \`attachments.add\` with \`type\` \`security.entity_card\` (not \`security.entity_list\`) and populate \`data\` from the profile (see **Rich single-entity card**). They asked for a **card** / **one** host, not a **list** of hosts — the list attachment is the wrong Canvas.
4. Summarize in prose why this host is the riskiest among hosts in scope.

### Example 6: “Details / profile” vs “List / compare” wording

- User: “**Details** on the riskiest host”, “**more about** that host”, “**profile** / **deep dive** for this user” → treat like Example 5: one winner, \`security.entity_card\` after \`security.get_entity\`. **Never** \`security.entity_list\` for that intent.

- User: “**List** the **five** riskiest hosts”, “**compare** these hosts”, “**who are** the riskiest users”, “**show** risky **hosts**” → \`security.search_entities\` with matching \`maxResults\`, \`security.get_entity\` per row, then \`security.entity_list\` with **every** matching row in \`data.entities\` (**one row is OK** if only one matched).

### Example 7: List question with only one matching entity

User query: List all critical-risk hosts in my tenant (filters are strict and only **one** host matches).

Steps:
1. Use \`security.search_entities\` with the requested filters.
2. Use \`security.get_entity\` for that single host.
3. Call \`attachments.add\` with \`type\` \`security.entity_list\` and \`entities\`: **one** element — list intent still uses the **list** attachment so the user sees the **entities table** Canvas, not the **card**.

### Example 7b: “Riskiest entities in the system” (generic plural, not the EA page)

User query: Show the riskiest entities in the system.

Steps:
1. Use \`security.search_entities\` with \`entityTypes\` spanning the kinds you will rank (e.g. \`["host","user","service"]\`) or aligned with the user’s scope, \`maxResults\` per investigation norms, ordered by risk.
2. Use \`security.get_entity\` for **every** row you include in the answer.
3. Call \`attachments.add\` **once** with \`type\` \`security.entity_list\` and \`data.entities\` containing **all** those rows. **Do not** skip this because the prose is a table or because you added another attachment; **do not** use **only** \`security.entity_analytics_dashboard\` — the user did **not** ask to open the **Entity Analytics home/overview** page by name.
4. In the assistant markdown, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from step 3’s tool result so the user can open **Preview → Canvas**.

### Example 8: Riskiest hosts **and** users (multi-type, one message)

User query: Show me the most riskiest hosts and users in my system.

Steps:
1. Use \`security.search_entities\` with \`entityTypes: ["host"]\`, a \`riskScoreMin\` parameter (per investigation rules for riskiness questions — use \`0\` when no numeric cutoff was given), and \`maxResults\` for how many hosts to show (e.g. 10). Repeat with \`entityTypes: ["user"]\` for the users side (same \`maxResults\` unless the user specified otherwise).
2. For **every** host and **every** user row returned, call \`security.get_entity\`.
3. Call \`attachments.add\` **once** with \`type\` \`security.entity_list\`, \`attachmentLabel\` like “Highest-risk hosts and users”, and \`data.entities\` containing **all** hosts and users you are presenting (single table Canvas). **Do not** skip the attachment because there are two entity types or because you already wrote a markdown table.

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

### Top N entities (list intent)
When the user asked for a **list** / **ranking** / **table** of entities and you have **N ≥ 1** rows to show, you **MUST** call \`attachments.add\` with \`security.entity_list\` (after \`security.get_entity\` for each row), including when **N === 1**. **On its own line** in the same message, output \`<render_attachment id="ATTACHMENT_ID" version="VERSION" />\` from that tool result so the user gets **Preview / Canvas** (**Mandatory — \`<render_attachment>\`**). Then in the message body provide a short table with the key fields:

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
      'Attachments: security.entity_card for one entity or details/card; security.entity_list for any list/table/ranking/top/riskiest/plural-identity ask including **riskiest entities in the system** (1+ rows; mandatory after search when list intent); **always security.entity_list when presenting 2+ entities or user asked top/riskiest/which entities**; security.entity_analytics_dashboard **only** when user explicitly wants the **Entity Analytics home/overview page** in Canvas — **never** use dashboard alone instead of entity_list for ranking/list asks. After each attachments.add for entity_list / entity_card / entity_analytics_dashboard, output `<render_attachment id=… version=… />` in markdown (required for Preview/Canvas UI). ' +
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
