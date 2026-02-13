/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_THREAT_INTEL_SKILL = defineSkillType({
  id: 'security.threat_intel',
  name: 'threat-intel',
  basePath: 'skills/security/threat-intel',
  description: 'Read-only threat intel search and enrichment guidance',
  content: `# Security Threat Intelligence

## What this skill does
Provides read-only guidance for TI lookups and indicator enrichment (without changing security posture).

## When to use
- You have an IP/domain/hash and want enrichment context.
- You want suggestions for pivots and correlation queries.

## Guardrails
- Read-only only; do not block/allowlist/disable protections.
`,
  getAllowedTools: () => ['security.security_labs_search'],
});
