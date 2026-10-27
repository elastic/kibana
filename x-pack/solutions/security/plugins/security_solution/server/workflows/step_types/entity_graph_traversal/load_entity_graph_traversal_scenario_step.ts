/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  listEntityGraphTraversalScenarioIds,
  loadEntityGraphTraversalPlan,
} from '@kbn/workflows/managed';
import { loadEntityGraphTraversalScenarioStepCommonDefinition } from '../../../../common/workflows/step_types/entity_graph_traversal/load_entity_graph_traversal_scenario_step_common';

export const loadEntityGraphTraversalScenarioStepDefinition = createServerStepDefinition({
  ...loadEntityGraphTraversalScenarioStepCommonDefinition,
  handler: async (context) => {
    const { scenario_id, overrides } = context.input;
    try {
      const plan = loadEntityGraphTraversalPlan(scenario_id, overrides);
      if (!plan) {
        return {
          error: new Error(
            `Unknown entity graph traversal scenario "${scenario_id}". Available: ${listEntityGraphTraversalScenarioIds().join(
              ', '
            )}`
          ),
        };
      }
      context.logger.debug(
        `entity graph traversal scenario "${plan.id}" loaded: ${
          plan.hops.length
        } hops, limits ${JSON.stringify(plan.limits)}`
      );
      return { output: plan };
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
});
