/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_SLO_READONLY_SKILL = defineSkillType({
  id: 'observability.slo_readonly',
  name: 'slo_readonly',
  basePath: 'skills/observability',
  description: 'Read-only guidance for SLO discovery and interpretation',
  content: `# Observability SLOs (Read-only)

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- SLOs (Service Level Objectives)
- Error budgets
- SLO status or health
- Burn rate alerts

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing SLOs:
- If SLOs found: "Found X SLOs:" then list names, status, and error budget %
- If no SLOs: "No SLOs configured."

### When checking status:
Show SLO status from tool results: name, current status, remaining error budget.

## FORBIDDEN RESPONSES
- Do NOT explain what SLOs are
- Do NOT suggest how to create SLOs
- Do NOT add information not in tool results

## Tools
- Use \`observability.get_slos\` for listing/getting SLO summaries (read-only)
- Use \`observability.get_alerts\` for related alert context (read-only)
`,
  getAllowedTools: () => ['observability.get_slos', 'observability.get_alerts'],
});
