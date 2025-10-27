/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BulkOperationStatusResponse } from '@kbn/slo-schema';
import { bulkOperationParamsSchema, bulkOperationStatusParamsSchema } from '@kbn/slo-schema';
import { v4 } from 'uuid';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { TYPE } from '../../services/tasks/types/task_types';

export const bulkDeleteSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_delete 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkOperationParamsSchema,
  handler: async ({ request, params, plugins }) => {
    await assertPlatinumLicense(plugins);
    const taskManager = await plugins.taskManager.start();

    const taskId = v4();
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: TYPE.DELETE,
        scope: ['observability', 'slo'],
        state: {},
        runAt: new Date(Date.now() + 3 * 1000),
        params: params.body,
      },
      { request }
    );

    return { taskId };
  },
});

export const getBulkDeleteStatusRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkOperationStatusParamsSchema,
  handler: async ({ params, plugins }): Promise<BulkOperationStatusResponse> => {
    await assertPlatinumLicense(plugins);

    const taskManager = await plugins.taskManager.start();
    const task = await taskManager.get(params.path.taskId).catch(() => undefined);

    if (!task) {
      return {
        isDone: true,
        error: 'Task not found',
      } satisfies BulkOperationStatusResponse;
    }

    if (!task.state.isDone) {
      return { isDone: false, results: [] } satisfies BulkOperationStatusResponse;
    }

    return {
      isDone: task.state.isDone,
      results: task.state.results,
      error: task.state.error,
    } satisfies BulkOperationStatusResponse;
  },
});
