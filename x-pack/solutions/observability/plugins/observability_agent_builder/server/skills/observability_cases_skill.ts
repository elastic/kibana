/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const OBSERVABILITY_CASES_SKILL: Skill = {
    namespace: 'observability.cases',
    name: 'Observability Cases',
    description: 'Find and summarize Observability cases',
    content: `# Observability Cases

## What this skill does
Helps you find and summarize cases owned by Observability.

## Tools and operations
- Use \`${platformCoreTools.cases}\` with \`owner: "observability"\`.\n
`,
    tools: [createToolProxy({ toolId: platformCoreTools.cases })],
};



