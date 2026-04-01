/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Placeholder — real implementation added in PR 8
import type { SkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

export const alertRetrievalBuilderSkill = {
  basePath: 'skills/security/attack-discovery',
  content:
    '# Attack Discovery Alerts ES|QL Query Builder\n\nPlaceholder — real implementation added in PR 8.',
  description: 'Placeholder — real implementation added in PR 8.',
  getRegistryTools: () => ['platform.core.generate_esql', 'platform.core.execute_esql'],
  id: 'attack-discovery-alert-retrieval-builder',
  name: 'attack-discovery-alerts-esql-query-builder',
  referencedContent: [
    {
      content: 'Placeholder — real implementation added in PR 8.',
      name: 'example-esql-queries',
      relativePath: './examples',
    },
  ],
} as unknown as SkillDefinition;
