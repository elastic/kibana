/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const OBSERVABILITY_CASES_SKILL = defineSkillType({
  id: 'observability.cases',
  name: 'cases',
  basePath: 'skills/observability',
  description: 'Find and summarize Observability cases',
  content: `# Observability Cases

## What this skill does
Helps you find and summarize cases owned by Observability.

## Tools and operations
- Use \`platform.core.cases\` with \`owner: "observability"\`.

`,
  getAllowedTools: () => ['platform.core.cases'],
});
