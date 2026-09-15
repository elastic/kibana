/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createPollServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { killProcessStepCommonDefinition } from '../../../../common/workflows/step_types/kill_process_step/kill_process_step_common';
import {
  getAuthorizedResponseActionsClient,
  pollResponseAction,
} from '../../utils/response_actions_step_utils';

const pollStateSchema = z.object({
  action_id: z.string(),
});

export const createKillProcessStepDefinition = (
  endpointAppContextService: EndpointAppContextService
) =>
  createPollServerStepDefinition({
    ...killProcessStepCommonDefinition,
    stateSchema: pollStateSchema,
    policy: { strategy: 'fixed', intervalMs: 10_000 },
    ceilings: { maxAttempts: 60, maxWaitMs: 600_000 },
    start: async (context) => {
      const { endpoint_ids: endpointIds, parameters, comment } = context.input;

      const { client } = await getAuthorizedResponseActionsClient(
        endpointAppContextService,
        context,
        'canKillProcess'
      );

      const dispatched = await client.killProcess({
        endpoint_ids: endpointIds,
        parameters,
        comment: comment ?? '',
      });

      return { state: { action_id: dispatched.id } };
    },
    poll: (context) =>
      pollResponseAction(endpointAppContextService, context, 'Kill-process action'),
  });
