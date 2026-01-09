/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_CASES_SKILL: Skill = {
  namespace: 'security.cases',
  name: 'Security Cases',
  description: 'Create and update cases; add comments',
  content: `# Security Cases

## What this skill does
Helps you create/update Security cases and add comments in a controlled, auditable way.

## When to use
- The user wants a case created for an investigation.
- The user wants to update case fields (status, title, tags, severity).
- The user wants to add a comment/update log.

## Inputs to ask the user for
- For create: **title**, **description**, optional tags/severity
- For update: **case id** and the exact fields to change
- For comments: **case id** and the comment text

## Tools and operations
- Use \`security.cases\`:\n
  - \`create_case\`, \`update_case\`, \`add_comment\`, \`attach_alerts\` (**each requires \`confirm: true\`**)\n
\n
## Comment shape (important)
- For \`add_comment\`, pass \`params.comment\` as a **string** (markdown).\n
- If you accidentally pass an object like \`{ comment: "...", type: "user", owner: "securitySolution" }\`, it will still work, but only \`comment.comment\` is used.\n

## Safe workflow
1) Confirm the case target (id) and intended changes.\n
2) Restate changes and request explicit confirmation.\n
3) Call the tool with \`confirm: true\`.\n

## Example
- **User**: “Create a case for suspicious login activity.”\n
- **Assistant**: Draft title/description → ask “Confirm?” → call \`create_case\` with \`confirm: true\`.\n
`,
  tools: [createToolProxy({ toolId: 'security.cases' })],
};



