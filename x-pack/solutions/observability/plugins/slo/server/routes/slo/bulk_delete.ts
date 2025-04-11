/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkDeleteSLOParamsSchema, bulkDeleteStatusParamsSchema } from '@kbn/slo-schema';
import { v4 as uuidv4 } from 'uuid';
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
  params: bulkDeleteSLOParamsSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);
    const taskManager = await plugins.taskManager.start();

    const task = await taskManager.ensureScheduled(
      {
        id: `${TYPE}:${uuidv4()}`,
        taskType: TYPE,
        scope: ['observability', 'slo'],
        state: {},
        runAt: new Date(Date.now() + 3 * 1000),
        params: { ...params.body },
      },
      { request }
    );

    return { taskId: task.id };
  },
});

export const getBulkDeleteStatusRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_bulk_delete/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkDeleteStatusParamsSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const taskManager = await plugins.taskManager.start();

    const task = await taskManager.get(params.path.id);

    return { task };
  },
});
