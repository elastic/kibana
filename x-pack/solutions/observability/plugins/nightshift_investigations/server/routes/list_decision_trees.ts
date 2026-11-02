/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { CORTEX_PAGE_STATUSES } from '../../common/cortex';
import type { DecisionTreeStats, DecisionTreeSummary } from '../../common/decision_trees';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const buildStats = (trees: DecisionTreeSummary[]): DecisionTreeStats => {
  const established = trees.filter((tree) => tree.status === 'established').length;
  const totalVersions = trees.reduce((sum, tree) => sum + tree.version, 0);
  const lastUpdated = trees.reduce<string | undefined>((latest, tree) => {
    if (latest === undefined || tree.updated_at > latest) {
      return tree.updated_at;
    }
    return latest;
  }, undefined);

  return {
    total: trees.length,
    established,
    total_versions: totalVersions,
    ...(lastUpdated !== undefined ? { last_updated: lastUpdated } : {}),
  };
};

export const listDecisionTreesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/decision_trees',
  options: {
    access: 'internal',
    summary: 'List decision trees',
    description: 'Returns the current head of every decision tree, newest first.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    query: z
      .object({
        status: z.enum(CORTEX_PAGE_STATUSES).optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({ request, params, getDecisionTreeStore, isDecisionTreesEnabled }) => {
    if (!isDecisionTreesEnabled()) throw notFound('Decision trees are not enabled');

    const all = await getDecisionTreeStore(request).list();
    const status = params.query?.status;
    const trees = status ? all.filter((tree) => tree.status === status) : all;

    // Stats always describe the whole index, so the header does not change as filters narrow.
    return { trees, stats: buildStats(all) };
  },
});
