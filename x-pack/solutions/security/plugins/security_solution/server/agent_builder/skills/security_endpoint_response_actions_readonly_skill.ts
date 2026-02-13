/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_ENDPOINT_RESPONSE_ACTIONS_READONLY_SKILL = defineSkillType({
  id: 'security.endpoint_response_actions_readonly',
  name: 'endpoint-response-actions-readonly',
  basePath: 'skills/security/endpoints',
  description: 'Read-only guidance for viewing response actions and their status',
  content: `# Security Endpoint Response Actions (Read-only)

## What this skill does
Provides read-only guidance for reviewing endpoint response actions and interpreting their status.

## Guardrails
- Do not execute response actions (isolate/kill-process/etc.).
`,
});
