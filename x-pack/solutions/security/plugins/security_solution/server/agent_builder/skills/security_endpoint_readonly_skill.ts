/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const SECURITY_ENDPOINT_READONLY_SKILL: Skill = {
  namespace: 'security.endpoint_readonly',
  name: 'Security Endpoint (Read-only)',
  description: 'Read-only endpoint posture and status guidance',
  content: `# Security Endpoint (Read-only)

## What this skill does
Provides safe, read-only guidance for endpoint investigations (posture, status, common troubleshooting).

## When to use
- The user wants to understand endpoint health/posture issues.
- You need to recommend investigation steps without taking action on hosts.

## Guardrails
- Do not isolate/unisolate hosts.\n
- Do not trigger destructive endpoint actions.\n
`,
  tools: [],
};



