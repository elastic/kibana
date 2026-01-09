/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const SECURITY_RULE_EXCEPTIONS_PREVIEW_SKILL: Skill = {
  namespace: 'security.rule_exceptions_preview',
  name: 'Security Rule Exceptions Preview',
  description: 'Guidance for dry-running exception logic before applying changes',
  content: `# Security Rule Exceptions Preview

## What this skill does
Helps you reason about exception behavior and suggest a safe, narrow exception before applying it.\n

## Notes
- This skill currently provides guidance; if you need execution support, use existing rule/exception tooling and validate scope carefully.\n
`,
  tools: [],
};



