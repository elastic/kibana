/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import {
  DEFAULT_KNOWLEDGE_RESULTS,
  MAX_INPUT_STRING_CHARS,
  MAX_KNOWLEDGE_RESULTS,
  MAX_QUERY_CHARS,
} from '../../common/budget';

export const SearchIntegrationKnowledgeStepId = 'security.searchIntegrationKnowledge' as const;

export const searchIntegrationKnowledgeInputSchema = lazySchema(() =>
  z.object({
    query: z.string().min(1).max(MAX_QUERY_CHARS),
    package_name: z.string().min(1).max(MAX_QUERY_CHARS).optional().default('endpoint'),
    max: z
      .number()
      .int()
      .positive()
      .max(MAX_KNOWLEDGE_RESULTS)
      .optional()
      .default(DEFAULT_KNOWLEDGE_RESULTS),
  })
);

export const searchIntegrationKnowledgeOutputSchema = lazySchema(() =>
  z.object({
    available: z.boolean(),
    results: z
      .array(
        z.object({
          filename: z.string().max(MAX_INPUT_STRING_CHARS),
          version: z.string().max(MAX_INPUT_STRING_CHARS),
          excerpt: z.string(),
        })
      )
      .max(MAX_KNOWLEDGE_RESULTS),
  })
);

export const searchIntegrationKnowledgeStepCommonDefinition: BaseStepDefinition<
  typeof searchIntegrationKnowledgeInputSchema,
  typeof searchIntegrationKnowledgeOutputSchema
> = {
  id: SearchIntegrationKnowledgeStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.searchIntegrationKnowledge.label', {
    defaultMessage: 'Search integration knowledge',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.searchIntegrationKnowledge.description',
    {
      defaultMessage:
        'Search integration knowledge for short excerpts that ground a diagnosis, filtered by package_name (endpoint by default). This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: searchIntegrationKnowledgeInputSchema,
  outputSchema: searchIntegrationKnowledgeOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.searchIntegrationKnowledge.documentation.details',
      {
        defaultMessage:
          'Runs a semantic query over the integration knowledge index, filtered by package_name (endpoint by default). available is false when the index is absent. max bounds the excerpts returned.',
      }
    ),
    examples: [
      `## Search endpoint knowledge
\`\`\`yaml
- name: knowledge_search
  type: security.searchIntegrationKnowledge
  with:
    query: endpoint policy recommendations
    package_name: endpoint
    max: ${DEFAULT_KNOWLEDGE_RESULTS}
\`\`\``,
    ],
  },
};
