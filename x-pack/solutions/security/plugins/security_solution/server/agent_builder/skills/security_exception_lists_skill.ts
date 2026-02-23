/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_EXCEPTION_LISTS_SKILL = defineSkillType({
  id: 'security.exception_lists',
  name: 'exception-lists',
  basePath: 'skills/security/alerts/rules',
  description: 'Create and update exception list items safely',
  content: `# Security Exception Lists

## What this skill does
Helps you find, inspect, create, and update exception list items with minimal risk and clear scope.

## When to use
- The user wants to suppress benign detections by adding an exception.
- The user wants to review existing exception list items.

## Inputs to ask the user for
- **listId** (exception list id)
- For create/update: **name**, **description**, and **entries**
- Ensure scope is narrow (specific host/user/path/etc.)

## Tools and operations
- Use \`security.exception_lists\`:
  - \`find\`, \`get\` (read-only)
  - \`create\`, \`update\` (**requires \`confirm: true\`**)

## Entry guidance (LLM-friendly)
- Prefer \`match\` / \`match_any\` / \`exists\` / \`wildcard\` entries.
- Do not mix \`list\` entry type with other entry types in a single item.

## Safe workflow
1) Restate what will be excluded/included.
2) Ask for explicit confirmation.
3) Create/update with \`confirm: true\`.
`,
  getAllowedTools: () => ['security.exception_lists'],
});
