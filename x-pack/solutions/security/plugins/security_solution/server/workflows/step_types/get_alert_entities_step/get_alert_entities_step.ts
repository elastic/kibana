/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getAlertEntitiesInputSchema,
  getAlertEntitiesStepCommonDefinition,
} from '../../../../common/workflows/step_types/get_alert_entities_step/get_alert_entities_step_common';
import { getAlertEntities } from './get_alert_entities';
import { resolveSpaceId } from './resolve_space_id';

export const getAlertEntitiesStepDefinition = createServerStepDefinition({
  ...getAlertEntitiesStepCommonDefinition,
  handler: async (context) => {
    // The engine renders templates but does not validate the input, so defaults and bounds are
    // applied here.
    const parsed = getAlertEntitiesInputSchema.safeParse(context.input);

    if (!parsed.success) {
      return { error: new Error(`Invalid input: ${parsed.error.message}`) };
    }

    try {
      const output = await getAlertEntities({
        abortSignal: context.abortSignal,
        alertIds: parsed.data.alert_ids,
        entityTypes: parsed.data.entity_types,
        esClient: context.contextManager.getScopedEsClient(),
        maxEntities: parsed.data.max_entities,
        spaceId: await resolveSpaceId(context.contextManager),
      });

      return { output };
    } catch (error) {
      // A timeout or a cancelled run aborts the search; that is not a failure to log.
      if (!context.abortSignal?.aborted) {
        context.logger.error('Failed to get alert entities', error);
      }

      // Returned as it is: the engine reports an error's name as its type.
      return {
        error: error instanceof Error ? error : new Error('Failed to get alert entities'),
      };
    }
  },
});
