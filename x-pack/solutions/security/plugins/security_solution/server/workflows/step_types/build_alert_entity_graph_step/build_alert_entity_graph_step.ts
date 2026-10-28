/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { runBuildAlertEntityGraph } from './run_build_alert_entity_graph';
import {
  buildAlertEntityGraphStepCommonDefinition,
  buildAlertEntityGraphInputSchema,
} from '../../../../common/workflows/step_types/build_alert_entity_graph_step/build_alert_entity_graph_step_common';

export { buildAlertEntityGraphInputSchema };

export const buildAlertEntityGraphStepDefinition = createServerStepDefinition({
  ...buildAlertEntityGraphStepCommonDefinition,
  handler: async (context) => {
    try {
      const result = await runBuildAlertEntityGraph({
        esClient: context.contextManager.getScopedEsClient(),
        input: context.input,
      });
      return { output: result };
    } catch (error) {
      context.logger.error('Failed to get related alerts', error);
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to get related alerts'),
      };
    }
  },
});
