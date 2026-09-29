/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { toMemoryDisplayTelemetry } from '../memory/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

/**
 * Archives or restores a memory on a person's behalf.
 *
 * Requires the Nightshift manage privilege, not just read, so a reader of the
 * memory tab cannot retire memories. Mirrors `cortexWritePrivileges`.
 */
export const memoryWritePrivileges = [NIGHTSHIFT_API_PRIVILEGES.manage, 'agentBuilder:read'];
export const archiveMemoryPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/memory/pages/{id}/archive',
  options: {
    access: 'internal',
    summary: 'Archive or unarchive a Semantic Memory page',
    description: 'Sets `archive_reason` to `manual`, or clears it. Reversible, unlike delete.',
  },
  security: {
    authz: { requiredPrivileges: memoryWritePrivileges },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: z.object({
      archived: z.boolean(),
    }),
  }),
  handler: async ({ request, params, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    const page = params.body.archived
      ? await store.archive(params.path.id, 'manual')
      : await store.unarchive(params.path.id);

    if (!page) {
      throw notFound(`Semantic Memory page ${params.path.id} was not found`);
    }
    const display = toMemoryDisplayTelemetry(page, Date.now() / 1000);
    return {
      page,
      usefulness: display.conversionRate,
      confidence: display.confidence,
    };
  },
});
