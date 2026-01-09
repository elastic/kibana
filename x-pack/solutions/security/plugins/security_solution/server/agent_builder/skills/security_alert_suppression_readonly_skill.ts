/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { createToolProxy } from './utils/create_tool_proxy';

export const SECURITY_ALERT_SUPPRESSION_READONLY_SKILL: Skill = {
    namespace: 'security.alert_suppression_readonly',
    name: 'Security Alert Suppression (Read-only)',
    description: 'Explain alert suppression and why alerts may be missing (read-only)',
    content: `# Security Alert Suppression (Read-only)

## What this skill does
Helps you explain alert suppression behavior and why alerts may be missing.\n

## How to use
- Retrieve the detection rule (\`security.detection_rules -> get\`) and inspect its suppression-related fields.\n
- Provide guidance and recommended next investigative pivots.\n
`,
    tools: [createToolProxy({ toolId: 'security.detection_rules' })],
};



