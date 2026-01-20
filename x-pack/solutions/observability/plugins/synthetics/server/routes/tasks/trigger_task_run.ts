/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { PRIVATE_LOCATIONS_SYNC_TASK_ID } from '../../tasks/sync_private_locations_monitors_task';
import { scheduleCleanUpTask } from '../../synthetics_service/private_location/clean_up_task';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

export const getSyntheticsTriggerTaskRun: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.TRIGGER_TASK_RUN,
  validate: {
    params: schema.object({
      taskType: schema.oneOf([
        schema.literal('syncPrivateLocationMonitors'),
        schema.literal('cleanUpPackagePolicyTask'),
      ]),
    }),
  },
  writeAccess: true,
  handler: async ({ server, request }) => {
    const { taskType } = request.params;

    switch (taskType) {
      case 'syncPrivateLocationMonitors':
        await server.pluginsStart.taskManager.runSoon(PRIVATE_LOCATIONS_SYNC_TASK_ID);
        break;
      case 'cleanUpPackagePolicyTask':
        await scheduleCleanUpTask(server);

        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
  },
});
