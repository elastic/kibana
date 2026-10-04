/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { toMemoryDisplayTelemetry } from '../memory/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getMemoryPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/memory/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Get a Semantic Memory page',
    description:
      'Returns a single Semantic Memory page by its canonical `memory_<slug>` id, with the ' +
      'Elasticsearch revision a destructive write has to name.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    // The revision travels with the page: a delete has to be conditional on the
    // one the operator read, and this response is where they read it.
    const versioned = await store.getVersioned(params.path.id);
    if (!versioned) {
      throw notFound(`Semantic Memory page ${params.path.id} was not found`);
    }
    // Decay here rather than in the browser, so the numbers the UI shows are the
    // same ones the store computed and the same ones the model is handed.
    const display = toMemoryDisplayTelemetry(versioned.page, Date.now() / 1000);
    return {
      page: versioned.page,
      usefulness: display.conversionRate,
      confidence: display.confidence,
      version: { seq_no: versioned.seqNo, primary_term: versioned.primaryTerm },
    };
  },
});
