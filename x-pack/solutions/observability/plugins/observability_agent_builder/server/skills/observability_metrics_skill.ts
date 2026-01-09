/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const OBSERVABILITY_METRICS_SKILL: Skill = {
    namespace: 'observability.metrics',
    name: 'Observability Metrics',
    description: 'Explore infrastructure metrics and anomalies',
    content: `# Observability Metrics

## What this skill does
Helps you explore infra metrics (hosts, containers, k8s) and identify anomalies/regressions.

## When to use
- CPU/memory/disk/network issues are suspected.\n
- You need to correlate metrics with incidents/alerts.\n

## Inputs to ask the user for
- Time range\n
- Host/container identifiers\n
`,
    tools: [createToolProxy({ toolId: 'observability.get_data_sources' })],
};



