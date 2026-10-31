/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { traceGraphTraversalRoutes } from '@kbn/entity-store/common';
import { traceEntityGraphTraversalRoutesStepCommonDefinition } from '../../../../common/workflows/step_types/entity_graph_traversal/trace_entity_graph_traversal_routes_step_common';

export const traceEntityGraphTraversalRoutesStepDefinition = createServerStepDefinition({
  ...traceEntityGraphTraversalRoutesStepCommonDefinition,
  handler: async (context) => {
    const { seed_id: seedId, edges, targets } = context.input;
    return { output: { routes: traceGraphTraversalRoutes(seedId, edges, targets) } };
  },
});
