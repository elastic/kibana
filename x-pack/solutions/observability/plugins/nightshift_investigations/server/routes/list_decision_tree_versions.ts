/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const listDecisionTreeVersionsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/decision_trees/{symptom}/versions',
  options: {
    access: 'internal',
    summary: 'List decision tree versions',
    description: 'Returns the commit history of a decision tree, newest version first.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({
    path: z.object({
      symptom: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getDecisionTreeStore, isDecisionTreesEnabled }) => {
    if (!isDecisionTreesEnabled()) throw notFound('Decision trees are not enabled');

    const treeId = symptomTreeId(params.path.symptom);
    const store = getDecisionTreeStore(request);
    const tree = await store.get(treeId);
    if (!tree) {
      throw notFound(`Decision tree ${params.path.symptom} was not found`);
    }
    const versions = await store.listVersions(treeId);
    return { tree_id: treeId, versions };
  },
});
