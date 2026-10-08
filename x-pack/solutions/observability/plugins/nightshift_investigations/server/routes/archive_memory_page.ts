/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { MemoryVersionConflictError, toMemoryDisplayTelemetry } from '../memory/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

/** Needs manage, not just read, so a reader of the memory tab cannot retire memories. */
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
    path: lazySchema(() =>
      z.object({
        id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      })
    ),
    body: lazySchema(() =>
      z.object({
        archived: z.boolean(),
      })
    ),
  }),
  handler: async ({ request, params, context, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    const user = (await context.core).security.authc.getCurrentUser()?.username;
    let page: Awaited<ReturnType<typeof store.archive>>;
    try {
      page = params.body.archived
        ? await store.archive(params.path.id, 'manual', user)
        : await store.unarchive(params.path.id, user);
    } catch (err) {
      if (err instanceof MemoryVersionConflictError) {
        throw conflict('The memory changed while you were reviewing it. Reload and try again.');
      }
      throw err;
    }

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
