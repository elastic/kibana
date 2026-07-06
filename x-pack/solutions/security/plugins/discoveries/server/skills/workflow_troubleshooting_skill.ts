/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR8 (Skills). FF-off safe — never
// registered when the feature flag is OFF.

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';

export const createWorkflowTroubleshootingSkill = (_deps: unknown): SkillDefinition =>
  ({
    basePath: 'skills/platform/workflows',
    content: '',
    description: 'placeholder',
    id: 'security.attack-discovery.workflow-troubleshooting',
    name: 'workflow-troubleshooting',
  } as unknown as SkillDefinition);
