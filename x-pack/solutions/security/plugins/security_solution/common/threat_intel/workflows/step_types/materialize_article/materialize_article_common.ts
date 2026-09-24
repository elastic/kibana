/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';

export const MATERIALIZE_ARTICLE_STEP_TYPE = 'threat_intel.materialize_article' as const;

export const materializeArticleInputSchema = z.object({
  source_type: z.string(),
  article_url: z.string().optional().default(''),
  title: z.string().optional().default(''),
  rss_body_text: z.string(),
  existing_rendered_body_text: z.string().optional().default(''),
  existing_status: z.string().optional().default(''),
});

export const materializationStatusSchema = z.enum(['rendered', 'fallback', 'skipped']);

export const materializeArticleOutputSchema = z.object({
  body_text: z.string(),
  rendered_body_text: z.string(),
  materialization: z.object({
    provider: z.literal('jina'),
    status: materializationStatusSchema,
    attempted_at: z.string(),
    source_url: z.string(),
    rendered_chars: z.number(),
    truncated: z.boolean(),
    reason: z.string(),
  }),
});

export type MaterializeArticleInput = z.infer<typeof materializeArticleInputSchema>;
export type MaterializeArticleOutput = z.infer<typeof materializeArticleOutputSchema>;

export const materializeArticleStepCommonDefinition: BaseStepDefinition<
  typeof materializeArticleInputSchema,
  typeof materializeArticleOutputSchema
> = {
  id: MATERIALIZE_ARTICLE_STEP_TYPE,
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.threatIntelMaterializeArticle.label',
    { defaultMessage: 'Materialize threat intel article' }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.threatIntelMaterializeArticle.description',
    {
      defaultMessage:
        'Render an RSS article through Jina Reader and return the validated article body or the original RSS body as fallback.',
    }
  ),
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: materializeArticleInputSchema,
  outputSchema: materializeArticleOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.threatIntelMaterializeArticle.documentation.details',
      {
        defaultMessage:
          'Attempts unauthenticated Jina Reader materialization for RSS entries with a public article URL. It never drops the original RSS body: invalid, blocked, empty, or failed renders return that body with status fallback.',
      }
    ),
  },
};
