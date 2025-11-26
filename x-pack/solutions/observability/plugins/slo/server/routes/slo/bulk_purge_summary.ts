/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TasksGetResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  bulkPurgeSummaryParamsSchema,
  bulkPurgeSummaryStatusParamsSchema,
  type BulkPurgeSummaryStatusResponse,
} from '@kbn/slo-schema';
import { bulkPurgeSummary } from '../../services/bulk_purge_summary';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const bulkPurgeSummaryRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_purge_summary',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeSummaryParamsSchema,
  handler: async ({ request, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, spaceId, soClient } = await getScopedClients({ request, logger });

    return await bulkPurgeSummary(params.body, { scopedClusterClient, spaceId, soClient });
  },
});

export const getBulkPurgeSummaryStatusRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_bulk_purge_summary/{taskId}',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeSummaryStatusParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient } = await getScopedClients({ request, logger });

    const task = await scopedClusterClient.asCurrentUser.tasks
      .get({ task_id: params.path.taskId, wait_for_completion: false })
      .catch(() => undefined);

    if (!task) {
      return {
        completed: true,
        error: 'Task not found',
      } satisfies BulkPurgeSummaryStatusResponse;
    }

    if (!task.completed) {
      return {
        completed: false,
        status: toStatus(task),
      } satisfies BulkPurgeSummaryStatusResponse;
    }

    return {
      completed: true,
      status: toStatus(task),
    } satisfies BulkPurgeSummaryStatusResponse;
  },
});

function toStatus(task: TasksGetResponse): BulkPurgeSummaryStatusResponse['status'] {
  return {
    total: task.task.status?.total ?? 0,
    deleted: task.task.status?.deleted ?? 0,
    batches: task.task.status?.batches ?? 0,
    start_time_in_millis: task.task?.start_time_in_millis ?? 0,
    running_time_in_nanos: task.task?.running_time_in_nanos ?? 0,
  };
}
