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

/**
 * How far back the lineage walk goes. Mirrors the UI's cap; the server is
 * authoritative so a caller cannot request an unbounded walk.
 */
export const MAX_LINEAGE_DEPTH = 5;

export const getMemoryLineageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/memory/pages/{id}/lineage',
  options: {
    access: 'internal',
    summary: 'Get the merge lineage of a Semantic Memory page',
    description:
      'Walks `merged_from` breadth-first and returns the ancestors of a memory, ' +
      'nearest first. The walk is bounded and refuses to revisit an id, so a ' +
      'cyclic `merged_from` cannot loop it.',
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
    const root = await store.get(params.path.id);
    if (!root) {
      throw notFound(`Semantic Memory page ${params.path.id} was not found`);
    }

    const nowSec = Date.now() / 1000;
    // Ids already emitted as ancestors, plus the root. Used to reject cycles and
    // duplicates. A frontier id is added only once it has been *processed* —
    // marking the frontier up front would make every fetched page look already
    // seen and silently drop the whole chain.
    const seen = new Set<string>([root.id]);
    const ancestors: Array<{
      id: string;
      title: string;
      usefulness: number;
      archived: boolean;
    }> = [];

    let frontier = (root.merged_from ?? []).filter((id) => !seen.has(id));

    // How deep the walk actually got, which is not always MAX_LINEAGE_DEPTH: a
    // chain of one reports 1. Truncated by the cap, this also reports that the
    // walk stopped early, so a caller can tell a short chain from a clipped one.
    let reachedDepth = 0;

    for (let depth = 0; depth < MAX_LINEAGE_DEPTH && frontier.length > 0; depth++) {
      // One mget per level rather than one get per ancestor.
      const pages = await store.getMany(frontier);
      reachedDepth = depth + 1;
      const next: string[] = [];
      for (const page of pages) {
        if (seen.has(page.id)) continue;
        seen.add(page.id);
        ancestors.push({
          id: page.id,
          title: page.title,
          usefulness: toMemoryDisplayTelemetry(page, nowSec).conversionRate,
          archived: page.archived,
        });
        next.push(...(page.merged_from ?? []));
      }
      frontier = [...new Set(next)].filter((id) => !seen.has(id));
    }

    return { ancestors, depth: reachedDepth };
  },
});
