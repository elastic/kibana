/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_APM_SKILL = defineSkillType({
  id: 'observability.apm',
  name: 'apm',
  basePath: 'skills/observability',
  description: 'Investigate services, traces, errors and performance regressions',
  content: `# Observability APM

## What this skill does
Helps you investigate APM signals: services, traces, transactions, latency, errors, and dependencies.

## When to use
- A service is slow or erroring and you need root-cause hypotheses.
- You need a dependency map and downstream impact.

## Inputs to ask the user for
- Service name (or ask to list services)
- Time range and environment

## Safe workflow
1) Identify service + time range.
2) Summarize golden signals (latency, throughput, error rate).
3) Pivot into traces/errors and downstream deps.
`,
  getAllowedTools: () => [
    'observability.get_services',
    'observability.get_downstream_dependencies',
  ],
});
