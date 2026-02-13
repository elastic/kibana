/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_ALERTS_EXECUTION_SKILL = defineSkillType({
  id: 'observability.alerts_execution',
  name: 'alerts_execution',
  basePath: 'skills/observability',
  description: 'Execute read-only alert retrieval tools for Observability',
  content: `# Observability Alerts (Execution)

## What this skill does
Provides concrete, read-only tooling guidance for fetching Observability alerts.

## Tools
- Use \`observability.get_alerts\` for retrieving alerts.

## Notes
- This skill is read-only.
`,
  getAllowedTools: () => ['observability.get_alerts'],
});
