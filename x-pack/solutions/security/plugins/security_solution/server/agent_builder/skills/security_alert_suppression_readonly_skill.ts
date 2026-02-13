/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SECURITY_ALERT_SUPPRESSION_READONLY_SKILL = defineSkillType({
  id: 'security.alert_suppression_readonly',
  name: 'alert-suppression-readonly',
  basePath: 'skills/security/alerts',
  description: 'Explain alert suppression and why alerts may be missing (read-only)',
  content: `# Security Alert Suppression (Read-only)

## What this skill does
Helps you explain alert suppression behavior and why alerts may be missing.

## How to use
- Retrieve the detection rule (\`security.detection_rules -> get\`) and inspect its suppression-related fields.
- Provide guidance and recommended next investigative pivots.
`,
  getAllowedTools: () => ['security.detection_rules'],
});
