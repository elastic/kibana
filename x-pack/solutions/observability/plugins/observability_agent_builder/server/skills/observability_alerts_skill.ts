/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const OBSERVABILITY_ALERTS_SKILL: Skill = {
  namespace: 'observability.alerts',
  name: 'Observability Alerts',
  description: 'List and triage observability alerts',
  content: `# Observability Alerts

## What this skill does
Helps you list and triage observability alerts and correlate them to services/environments.

## When to use
- The user wants “what’s firing?” and the likely root cause.\n
- You need grouping by service, environment, severity.\n

## Inputs to ask the user for
- Time range\n
- Optional service/environment filters\n
`,
  tools: [createToolProxy({ toolId: 'observability.get_alerts' })],
};



