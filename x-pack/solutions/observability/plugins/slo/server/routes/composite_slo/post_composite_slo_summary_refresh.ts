/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { postCompositeSloSummaryRefreshParamsSchema } from '@kbn/slo-schema';
import { refreshCompositeSloSummaries } from '../../services/tasks/composite_slo_summary_task/refresh_composite_slo_summaries';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const postCompositeSloSummaryRefreshRoute = createCompositeSloServerRoute({
  endpoint: 'POST /internal/observability/slo_composites/_summary_refresh',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: postCompositeSloSummaryRefreshParamsSchema,
  handler: async ({ context, plugins, logger, config }) => {
    const taskManager = await plugins.taskManager.start();

    return refreshCompositeSloSummaries({
      taskManager,
      logger,
      config,
    });
  },
});
