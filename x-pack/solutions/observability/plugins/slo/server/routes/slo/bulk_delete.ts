/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BulkDeleteStatusResponse,
  bulkDeleteParamsSchema,
  bulkDeleteStatusParamsSchema,
} from '@kbn/slo-schema';
import { v4 } from 'uuid';
import { TYPE } from '../../services/tasks/bulk_delete/bulk_delete_task';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const bulkDeleteSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_delete 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkDeleteParamsSchema,
  handler: async ({ request, params, plugins }) => {
    await assertPlatinumLicense(plugins);
    const taskManager = await plugins.taskManager.start();

    const taskId = v4();
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: TYPE,
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
  params: bulkDeleteStatusParamsSchema,
  handler: async ({ params, plugins }): Promise<BulkDeleteStatusResponse> => {
    await assertPlatinumLicense(plugins);

    const taskManager = await plugins.taskManager.start();
    const task = await taskManager.get(params.path.taskId).catch(() => undefined);

    if (!task) {
      return {
        isDone: true,
        error: 'Task not found',
      } satisfies BulkDeleteStatusResponse;
    }

    if (!task.state.isDone) {
      return { isDone: false, results: [] } satisfies BulkDeleteStatusResponse;
    }

    return {
      isDone: task.state.isDone,
      results: task.state.results,
      error: task.state.error,
    } satisfies BulkDeleteStatusResponse;
  },
});
