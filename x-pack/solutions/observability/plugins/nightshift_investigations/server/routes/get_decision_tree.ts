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

export const getDecisionTreeRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/decision_trees/{symptom}',
  options: {
    access: 'internal',
    summary: 'Get a decision tree',
    description: 'Returns the current head of a single decision tree by its symptom slug.',
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

    const tree = await getDecisionTreeStore(request).get(symptomTreeId(params.path.symptom));
    if (!tree) {
      throw notFound(`Decision tree ${params.path.symptom} was not found`);
    }
    return { tree };
  },
});
