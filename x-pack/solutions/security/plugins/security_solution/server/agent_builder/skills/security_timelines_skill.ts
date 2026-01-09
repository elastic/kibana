/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_TIMELINES_SKILL: Skill = {
  namespace: 'security.timelines',
  name: 'Security Timelines',
  description: 'Find, create and update timelines safely',
  content: `# Security Timelines

## What this skill does
Helps you find, inspect, create, and update Security timelines in a non-destructive way.

## When to use
- The user wants a timeline created for an investigation.
- The user wants to update a timeline title/description or metadata.

## Inputs to ask the user for
- For find: search text + time range context
- For get/update: timeline id
- For create/update: desired title/description

## Tools and operations
- Use \`security.timelines\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`create\`, \`update\` (**requires \`confirm: true\`**)\n

## Safe workflow
1) Find and confirm the target.\n
2) For writes, restate changes and require confirmation.\n
3) Call create/update with \`confirm: true\`.\n
`,
  tools: [createToolProxy({ toolId: 'security.timelines' })],
};



