/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_DETECTION_RULES_SKILL: Skill = {
  namespace: 'security.detection_rules',
  name: 'Security Detection Rules',
  description: 'Find/get and enable/disable detection rules safely',
  content: `# Security Detection Rules

## What this skill does
Helps you find and inspect detection rules, and explicitly enable/disable them when the user asks.

## When to use
- The user wants to locate a detection rule or inspect its configuration.
- The user explicitly requests enabling/disabling a specific rule.

## Inputs to ask the user for
- **Rule id** (preferred) or identifying details (name, tag)
- For enable/disable: explicit user confirmation

## Tools and operations
- Use \`security.detection_rules\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`set_enabled\` (**requires \`confirm: true\`**)\n

## Safe workflow
1) Identify the exact rule(s).\n
2) If you need a specific rule, **always call \`find\` first** and pick an \`id\`.\n
3) Call \`get\` with \`params.id\` (required) to inspect the rule.\n
4) Summarize the impact of enable/disable.\n
5) Ask for explicit confirmation.\n
6) Call \`set_enabled\` with \`confirm: true\`.\n

## Examples (correct parameter shapes)
Find rules:
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "find",
    params: { search: "Windows", page: 1, perPage: 50 }
  }
})
\`\`\`

Get a rule (requires \`params.id\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "get",
    params: { id: "<rule_id>" }
  }
})
\`\`\`

Enable/disable a rule (requires \`confirm: true\`):
\`\`\`
tool("invoke_skill", {
  name: "security.detection_rules",
  parameters: {
    operation: "set_enabled",
    params: { id: "<rule_id>", enabled: false, confirm: true }
  }
})
\`\`\`
`,
  tools: [createToolProxy({ toolId: 'security.detection_rules' })],
};



