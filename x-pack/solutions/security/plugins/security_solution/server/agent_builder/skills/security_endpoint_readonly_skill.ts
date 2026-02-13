/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_ENDPOINT_READONLY_SKILL = defineSkillType({
  id: 'security.endpoint_readonly',
  name: 'endpoint-readonly',
  basePath: 'skills/security/endpoints',
  description: 'Read-only endpoint posture and status guidance',
  content: `# Security Endpoint (Read-only)

## What this skill does
Provides safe, read-only guidance for endpoint investigations (posture, status, common troubleshooting).

## When to use
- The user wants to understand endpoint health/posture issues.
- You need to recommend investigation steps without taking action on hosts.

## Guardrails
- Do not isolate/unisolate hosts.
- Do not trigger destructive endpoint actions.
`,
});
