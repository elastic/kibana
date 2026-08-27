/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { SLO_MANAGEMENT_SKILL_ID } from '@kbn/slo-schema';
import type { SloToolDeps } from '../common/deps';
import { listSlosTool } from '../tools/list_slos';

const description =
  'Discover, inspect, create, update, and delete Service Level Objectives (SLOs) within a conversation. Use when the user asks about SLO status, error budget consumption or remaining budget, which SLOs are breaching, creating a new SLO, updating an existing SLO, or deleting an SLO. Not for: alerting rule management (use the rule-management skill), Security detection rules, or raw data exploration without an SLO context.';

const content = `## When to Use This Skill

Use this skill when:
- A user asks about the status of their SLOs.
- A user wants to know which SLOs are breaching or burning their error budget.
- A user asks to create, update, or delete an SLO.
- A user wants to filter SLOs by name, tags, indicator type, or any other attribute.

Do **not** use this skill for:
- Creating, inspecting, or modifying alerting rules — use the \`rule-management\` skill instead.
- Security/SIEM detection rules.
- Querying raw Elasticsearch data without an SLO context — use data exploration skills for that.

---

## SLO Discovery

Call \`observability.list_slos\` to list SLOs and retrieve their current status and error budget.

### Filtering SLOs

- Use \`kqlQuery\` to filter by summary fields: \`slo.name\`, \`slo.tags\`, \`status\`, \`sli.value\`.
  Example: \`kqlQuery: "slo.name: *checkout* AND status: DEGRADED"\`
- Use \`sloIds\` to retrieve specific SLOs by their IDs. The IDs are OR-ed and ANDed with \`kqlQuery\` when both are provided.
  Example: \`sloIds: ["abc-123", "def-456"]\`
- Use both \`kqlQuery\` and \`sloIds\` together to narrow results to named SLOs that also match a filter.

### Pagination

- Default page size is 25. Use \`perPage\` (max 100) and \`page\` to iterate through results.
- When total > perPage, fetch additional pages by incrementing \`page\`.

### Which SLOs Are Breaching?

Sort by \`status\` or a burn rate field to surface the most critical SLOs first:
- \`sortBy: "status"\`, \`sortDirection: "asc"\` — BREACHED SLOs appear first alphabetically.
- \`sortBy: "burn_rate_1h"\`, \`sortDirection: "desc"\` — highest 1-hour burn rate first.

Read \`status\` and \`errorBudget\` from each returned summary — no separate data call is needed.
`;

export const createSloManagementSkill = (deps: SloToolDeps) =>
  defineSkillType({
    id: SLO_MANAGEMENT_SKILL_ID,
    name: 'slo-management',
    basePath: 'skills/observability',
    description,
    experimental: true,
    content,
    getInlineTools: () => [listSlosTool(deps)],
  });
