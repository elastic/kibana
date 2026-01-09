/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_ATTACK_DISCOVERY_SKILL: Skill = {
  namespace: 'security.attack_discovery',
  name: 'Security Attack Discovery',
  description: 'Search and summarize attack discovery results',
  content: `# Security Attack Discovery

## What this skill does
Helps you run/search Attack Discovery and produce a concise triage summary with recommended next steps.

## When to use
- The user asks for “what looks suspicious?” across a time range.
- You need high-level narratives and pivot points for investigation.

## Inputs to ask the user for
- Time range
- Environment/data source constraints (if available)

## Safe workflow
1) Run a targeted search.\n
2) Summarize findings: key entities, tactics/techniques, timelines.\n
3) Provide pivots (queries/filters) rather than destructive actions.\n
`,
  tools: [createToolProxy({ toolId: 'security.attack_discovery_search' })],
};



