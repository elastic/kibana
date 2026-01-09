/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_EXCEPTION_LISTS_SKILL: Skill = {
    namespace: 'security.exception_lists',
    name: 'Security Exception Lists',
    description: 'Create and update exception list items safely',
    content: `# Security Exception Lists

## What this skill does
Helps you find, inspect, create, and update exception list items with minimal risk and clear scope.

## When to use
- The user wants to suppress benign detections by adding an exception.
- The user wants to review existing exception list items.

## Inputs to ask the user for
- **listId** (exception list id)\n
- For create/update: **name**, **description**, and **entries**\n
- Ensure scope is narrow (specific host/user/path/etc.)\n

## Tools and operations
- Use \`security.exception_lists\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`create\`, \`update\` (**requires \`confirm: true\`**)\n

## Entry guidance (LLM-friendly)
- Prefer \`match\` / \`match_any\` / \`exists\` / \`wildcard\` entries.\n
- Do not mix \`list\` entry type with other entry types in a single item.\n

## Safe workflow
1) Restate what will be excluded/included.\n
2) Ask for explicit confirmation.\n
3) Create/update with \`confirm: true\`.\n
`,
    tools: [createToolProxy({ toolId: 'security.exception_lists' })],
};



