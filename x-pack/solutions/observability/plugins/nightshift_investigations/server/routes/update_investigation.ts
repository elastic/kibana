/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  MAX_HYPOTHESES,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  investigationHypothesisSchema,
  investigationImpactSchema,
  investigationStateSchema,
  severitySchema,
} from '@kbn/significant-events-schema';
import { UPDATABLE_INVESTIGATION_STATUSES } from '../../common';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

/**
 * Optional PATCH fields. Empty string and null are absent so quoted Liquid interpolations of
 * missing values (`severity: "${{ ... }}"`) and unquoted ones (`null`) do not fail enum/string
 * validation. Only top-level optional fields are normalized; `status` is required, so `""` still
 * fails it. Keys are kept (as undefined) rather than dropped so strict key checking still sees them.
 */
const absentToUndefined = (body: unknown): unknown => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      key !== 'status' && (value === '' || value === null) ? undefined : value,
    ])
  );
};

const updateInvestigationBodySchema = lazySchema(() =>
  z.preprocess(
    absentToUndefined,
    z.object({
      status: z.enum(UPDATABLE_INVESTIGATION_STATUSES),
      title: z.string().max(MAX_TITLE_LENGTH).optional(),
      error: z.string().max(MAX_TEXT_LENGTH).optional(),
      summary: z.string().max(MAX_TEXT_LENGTH).optional(),
      conclusion: z.string().max(MAX_TEXT_LENGTH).optional(),
      severity: severitySchema.optional(),
      hypotheses: z.array(investigationHypothesisSchema).max(MAX_HYPOTHESES).optional(),
      recommendations: investigationStateSchema.shape.recommendations.unwrap().optional(),
      conversation_id: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      impact: investigationImpactSchema.optional(),
    })
  )
);

export const updateInvestigationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PATCH /internal/nightshift/investigations/{id}',
  options: {
    access: 'internal',
    summary: 'Update investigation state',
    description:
      'Updates the investigation record with structured output and/or terminal status. Called by workflow steps at completion.',
  },
  security: {
    authz: {
      requiredPrivileges: ['agentBuilder:write'],
    },
  },
  params: z.object({
    path: lazySchema(() =>
      z.object({
        id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      })
    ),
    body: updateInvestigationBodySchema,
  }),
  handler: async ({ request, params, getInvestigationsClient }) => {
    const client = getInvestigationsClient(request);
    try {
      await client.update(params.path.id, params.body);
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
    return { acknowledged: true };
  },
});
