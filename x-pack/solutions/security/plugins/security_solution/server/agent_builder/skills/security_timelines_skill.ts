/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_TIMELINES_SKILL = defineSkillType({
  id: 'security.timelines',
  name: 'timelines',
  basePath: 'skills/security',
  description: 'Find, create and update timelines safely',
  content: `# Security Timelines

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Security timelines (listing, finding, searching)
- Timeline details or content
- Creating or updating timelines

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

Your response MUST contain ONLY information from the tool results.

### When listing timelines:
- If timelines found: "Found X timelines:" then list names and IDs
- If none: "No timelines found."

### When getting a timeline:
Show timeline details from tool results: title, description, ID.

## FORBIDDEN RESPONSES
- Do NOT explain what timelines are
- Do NOT add information not in tool results

## Tools and operations
- \`find\`, \`get\` (read-only)
- \`create\`, \`update\` (requires \`confirm: true\`)
`,
  getAllowedTools: () => ['security.timelines'],
});
