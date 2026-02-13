/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_METRICS_SKILL = defineSkillType({
  id: 'observability.metrics',
  name: 'metrics',
  basePath: 'skills/observability',
  description: 'Explore infrastructure metrics and anomalies',
  content: `# Observability Metrics

## What this skill does
Helps you explore infra metrics (hosts, containers, k8s) and identify anomalies/regressions.

## When to use
- CPU/memory/disk/network issues are suspected.
- You need to correlate metrics with incidents/alerts.

## Inputs to ask the user for
- Time range
- Host/container identifiers
`,
  getAllowedTools: () => ['observability.get_index_info'],
});
