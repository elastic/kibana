/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const OBSERVABILITY_SLOS_SKILL: Skill = {
  namespace: 'observability.slos',
  name: 'Observability SLOs',
  description: 'Create and update SLOs safely',
  content: `# Observability SLOs

## What this skill does
Helps you manage SLOs and interpret burn rates and error budgets.

## When to use
- The user wants to understand reliability over time.\n
- The user wants an SLO created/updated (non-destructive).\n

## Guardrails
- Do not delete SLOs.\n
`,
  tools: [],
};



