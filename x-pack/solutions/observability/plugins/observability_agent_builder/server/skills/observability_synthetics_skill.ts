/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const OBSERVABILITY_SYNTHETICS_SKILL: Skill = {
    namespace: 'observability.synthetics',
    name: 'Observability Synthetics',
    description: 'Create and update monitors safely',
    content: `# Observability Synthetics

## What this skill does
Helps you manage synthetics monitors and triage failing steps.

## When to use
- A monitor is failing and you need the failing step + likely cause.\n
- The user asks to create/update a monitor (non-destructive).\n

## Guardrails
- Do not delete monitors.\n
`,
    tools: [],
};



