/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { BulkDeleteStatusResponse } from '@kbn/slo-schema';
import { bulkDeleteParamsSchema, bulkDeleteStatusParamsSchema } from '@kbn/slo-schema';
import { v4 } from 'uuid';
import { toEventOrigin } from '../lib/telemetry';
import type { BulkDeleteTaskParams } from '../services/tasks/bulk_delete/bulk_delete_task';
import { TYPE } from '../services/tasks/bulk_delete/bulk_delete_task';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const bulkDeleteSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_delete 2023-10-31',
  options: {
    access: 'public',
    summary: 'Bulk delete SLO definitions and their associated summary and rollup data.',
    description:
      'Bulk delete SLO definitions and their associated summary and rollup data. This endpoint initiates a bulk deletion operation for SLOs, which may take some time to complete. The status of the operation can be checked using the `GET /api/observability/slos/_bulk_delete/{taskId}` endpoint.',
    operationId: 'bulkDeleteOp',
    oasOperationObject: () => path.join(__dirname, 'examples/bulk_delete.yaml'),
  },
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
    const taskParams: BulkDeleteTaskParams = {
      ...params.body,
      origin: toEventOrigin(request),
    };
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        state: {},
        runAt: new Date(Date.now() + 3 * 1000),
        params: taskParams,
      },
      { request }
    );

    return { taskId };
  },
});

export const getBulkDeleteStatusRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31',
  options: {
    access: 'public',
    summary: 'Retrieve the status of the bulk deletion',
    description:
      'Retrieve the status of the bulk deletion operation for SLOs. This endpoint returns the status of the bulk deletion operation, including whether it is completed and the results of the operation.',
    operationId: 'bulkDeleteStatusOp',
    oasOperationObject: () => path.join(__dirname, 'examples/bulk_delete_status.yaml'),
  },
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
