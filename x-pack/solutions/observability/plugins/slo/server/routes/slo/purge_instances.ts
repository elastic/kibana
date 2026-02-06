/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksGetResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  purgeInstancesParamsSchema,
  purgeInstancesStatusParamsSchema,
  type PurgeInstancesStatusResponse,
} from '@kbn/slo-schema';
import { purgeInstances } from '../../services/purge_instances';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const purgeInstancesRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_purge_instances',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: purgeInstancesParamsSchema,
  handler: async ({ request, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, spaceId, settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    const settings = await settingsRepository.get();
    return await purgeInstances(params.body, { settings, scopedClusterClient, spaceId });
  },
});

export const getPurgeInstancesStatusRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_purge_instances/{taskId}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: purgeInstancesStatusParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient } = await getScopedClients({ request, logger });

    const task = await scopedClusterClient.asCurrentUser.tasks
      .get({ task_id: params.path.taskId, wait_for_completion: false })
      .catch(() => undefined);

    if (!task) {
      return {
        completed: false,
        error: 'Task not found',
      } satisfies PurgeInstancesStatusResponse;
    }

    if (!task.completed) {
      return {
        completed: false,
        status: toStatus(task),
      } satisfies PurgeInstancesStatusResponse;
    }

    return {
      completed: true,
      status: toStatus(task),
    } satisfies PurgeInstancesStatusResponse;
  },
});

function toStatus(task: TasksGetResponse): PurgeInstancesStatusResponse['status'] {
  return {
    total: task.task.status?.total ?? 0,
    deleted: task.task.status?.deleted ?? 0,
    batches: task.task.status?.batches ?? 0,
    start_time_in_millis: task.task?.start_time_in_millis ?? 0,
    running_time_in_nanos: task.task?.running_time_in_nanos ?? 0,
  };
}
