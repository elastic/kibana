/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_SYNTHETICS_SKILL = defineSkillType({
  id: 'observability.synthetics',
  name: 'synthetics',
  basePath: 'skills/observability',
  description: 'Create and update monitors safely',
  content: `# Observability Synthetics

## What this skill does
Helps you manage synthetics monitors and triage failing steps.

## When to use
- A monitor is failing and you need the failing step + likely cause.
- The user asks to create/update a monitor (non-destructive).

## Guardrails
- Do not delete monitors.
`,
});
