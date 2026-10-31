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
  DEFAULT_FIND_LIMIT,
  FETCH_CAP_DEFAULT,
  FETCH_CAP_MAX,
  MAX_FIND_LIMIT,
  MAX_INPUT_STRING_CHARS,
  MAX_ITEM_IDS,
} from '../../../common/budget';
import { artifactItemSchema, artifactSummarySchema } from '../contracts/artifact_ref';
import { osSchema } from '../contracts/enums';
import { populationSchema } from '../contracts/summaries';

const boundedString = lazySchema(() => z.string().max(MAX_INPUT_STRING_CHARS));

export const FindEndpointArtifactsStepId = 'security.findEndpointArtifacts' as const;

export const findEndpointArtifactsInputSchema = lazySchema(() =>
  z.object({
    list_id: boundedString,
    item_ids: z.array(boundedString).max(MAX_ITEM_IDS).optional(),
    policy_id: boundedString.optional(),
    os: osSchema.optional(),
    search: boundedString.optional(),
    fetch_cap: z.number().int().positive().max(FETCH_CAP_MAX).optional().default(FETCH_CAP_DEFAULT),
    sort_field: boundedString.optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    sort: z.literal('updated_at_item_id').optional(),
    offset: z.number().int().nonnegative().optional().default(0),
    limit: z.number().int().positive().max(MAX_FIND_LIMIT).optional(),
  })
);

export const findEndpointArtifactsOutputSchema = lazySchema(() =>
  z.object({
    items: z.array(artifactItemSchema),
    summaries: z.array(artifactSummarySchema),
    population: populationSchema,
    next_offset: z.number().int().nonnegative().nullable(),
    unauthorized: z.boolean(),
  })
);

export const findEndpointArtifactsStepCommonDefinition: BaseStepDefinition<
  typeof findEndpointArtifactsInputSchema,
  typeof findEndpointArtifactsOutputSchema
> = {
  id: FindEndpointArtifactsStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.findEndpointArtifacts.label', {
    defaultMessage: 'Find endpoint artifacts',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.findEndpointArtifacts.description',
    {
      defaultMessage:
        'Read one Elastic Defend exception list and return the items, compact summaries, and fetch population. This step is tech preview; its contract can change.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: findEndpointArtifactsInputSchema,
  outputSchema: findEndpointArtifactsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.findEndpointArtifacts.documentation.details',
      {
        defaultMessage:
          'Reads GET /api/exception_lists/items/_find for exactly one list_id. item_ids, when set, resolves only those ids. policy_id, os, and search filter the route. fetch_cap bounds the fetched window. sort_field and sort_order are passed to the route. sort updated_at_item_id orders the fetched union in memory. offset and limit slice that union. A 403 returns unauthorized with an empty item list.',
      }
    ),
    examples: [
      `## Find recent trusted apps
\`\`\`yaml
- name: find_trusted_apps
  type: security.findEndpointArtifacts
  with:
    list_id: endpoint_trusted_apps
    fetch_cap: ${FETCH_CAP_DEFAULT}
    sort_field: updated_at
    sort_order: desc
    limit: ${DEFAULT_FIND_LIMIT}
\`\`\``,
    ],
  },
};
