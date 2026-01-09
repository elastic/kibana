/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL: Skill = {
    namespace: 'security.endpoint_response_actions_readonly',
    name: 'Security Endpoint Response Actions (Read-only)',
    description: 'Read-only guidance for viewing response actions and their status',
    content: `# Security Endpoint Response Actions (Read-only)

## What this skill does
Provides read-only guidance for reviewing endpoint response actions and interpreting their status.\n

## Guardrails
- Do not execute response actions (isolate/kill-process/etc.).\n
`,
    tools: [],
};



