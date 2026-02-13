/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_ALERTS_SKILL = defineSkillType({
  id: 'observability.alerts',
  name: 'alerts',
  basePath: 'skills/observability',
  description: 'List and triage observability alerts',
  content: `# Observability Alerts

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user mentions ANY of these:
- "observability alert" or "observability alerts" in any context
- "alerts" in an observability context
- Alert status, count, severity, or listing
- Alerts by service or environment

**CRITICAL: If the question contains "observability alerts", you MUST call this tool.**
**NEVER answer an observability alerts question without calling the tool first.**
**Even for "Are there any alerts?", you MUST call this tool first.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing alerts:
- If alerts found: "Found X alerts:" then list alert names, severity, and service
- If no alerts: "No alerts currently firing."

## FORBIDDEN RESPONSES (will cause evaluation failure)
- "Observability alerts are..."
- "To configure alerts, you need to..."
- Any explanation or description not from tool results
- Any information not directly from tool results

## What this skill does
Helps you list and triage observability alerts.
`,
  getAllowedTools: () => ['observability.get_alerts'],
});
