/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SECURITY_CREATE_WATCHLIST_TOOL_ID } from '../../tools';

export const getWatchlistSkill = () =>
  defineSkillType({
    id: 'watchlist-create',
    name: 'watchlist-create',
    basePath: 'skills/security/watchlists',
    description:
      'Guide to creating AI-generated watchlists from Entity Store data. Use when a user asks to create a watchlist, monitor a set of entities, or track users/hosts matching a risk or behavioral criterion.',
    content: SKILL_CONTENT,
    getRegistryTools: () => [
      SECURITY_CREATE_WATCHLIST_TOOL_ID,
      platformCoreTools.generateEsql,
      platformCoreTools.productDocumentation,
    ],
  });

const SKILL_CONTENT = `# AI Watchlist Creation

## When to Use This Skill

Use this skill when the user asks to:
- Create a watchlist (e.g., "create a watchlist for high-risk users", "monitor hosts with critical asset criticality")
- Track or watch a dynamic set of entities based on risk, behavior, or attributes
- Populate a watchlist from Entity Store results

## Core Workflow

### Step 1: Clarify the Criteria (if needed)

If the user's request is ambiguous, ask one focused clarifying question:
- Which entity type? (user / host / service / all)
- Which risk level or score threshold?
- Any time constraint (e.g., last seen in the past 30 days)?

Skip this step if the request is already specific enough.

### Step 2: Call \`security.create_watchlist\`

Always use the \`security.create_watchlist\` tool. Pass:
- \`user_query\`: the natural language description of which entities to include
- \`watchlist_name\` (optional): a human-friendly name; the tool derives one if omitted
- \`risk_modifier\` (optional): 0.0–2.0 float; defaults to 1.0 (no modifier)

The tool will:
1. Generate an ES|QL query against the Entity Store
2. Execute it to find matching entities
3. Create a watchlist saved object with a live entity source (KQL-based)
4. Return an attachment ID and version

### Step 3: Render the Attachment

After \`security.create_watchlist\` succeeds, **always** render the attachment inline:

\`\`\`
<render_attachment id="ATTACHMENT_ID" version="VERSION" />
\`\`\`

### Step 4: Report the Result

Summarise in one or two sentences:
- Watchlist name
- Number of entities matched
- The ES|QL query used (so the user can verify or refine)

---

## Field Reference for Entity Store

| Field | Description |
|---|---|
| \`entity.name\` | Entity display name (username or hostname) |
| \`entity.EngineMetadata.Type\` | \`user\`, \`host\`, \`service\`, \`generic\` |
| \`entity.risk.calculated_score_norm\` | Normalised risk score 0–100 |
| \`entity.risk.calculated_level\` | \`Unknown\`, \`Low\`, \`Moderate\`, \`High\`, \`Critical\` |
| \`asset.criticality\` | \`low_impact\`, \`medium_impact\`, \`high_impact\`, \`extreme_impact\` |
| \`entity.lifecycle.first_seen\` | ISO timestamp of first activity |
| \`entity.lifecycle.last_activity\` | ISO timestamp of most recent activity |

---

## Risk Modifier Reference

| Value | Effect |
|---|---|
| 0.0 | Removes all risk contribution |
| 0.5 | Halves risk contribution |
| 1.0 | No change (default) |
| 1.5 | 50 % increase |
| 2.0 | Doubles risk contribution |

---

## Example Interactions

**User:** "Create a watchlist for users with the highest risk"

1. Call \`security.create_watchlist\` with \`user_query: "users with the highest risk score"\`
2. Render the returned attachment
3. Report: "Created watchlist **AI Watchlist: users with the highest risk score** with 12 users. The entity source will stay live — any new high-risk users matching the query will automatically be included."

---

**User:** "Watch all hosts that haven't been seen in the last 7 days but have a high risk score"

1. Call \`security.create_watchlist\` with:
   \`user_query: "hosts with high risk score not seen in the last 7 days"\`
2. Render attachment, report result.

---

## ⚠️ CRITICAL RULES

1. ALWAYS call \`security.create_watchlist\` — never describe the steps without executing them.
2. ALWAYS render the attachment after a successful call.
3. The watchlist entity source is **live**: entities matching the KQL rule will be included on each sync. Communicate this to the user.
4. If the tool returns 0 entities, tell the user clearly and suggest relaxing the criteria.
`;
