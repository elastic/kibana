/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_SLOS_SKILL = defineSkillType({
  id: 'observability.slos',
  name: 'slos',
  basePath: 'skills/observability',
  description: 'Create and update SLOs safely',
  content: `# Observability SLOs

## What this skill does
Helps you manage SLOs and interpret burn rates and error budgets.

## When to use
- The user wants to understand reliability over time.
- The user wants an SLO created/updated (non-destructive).

## Guardrails
- Do not delete SLOs.
`,
});
