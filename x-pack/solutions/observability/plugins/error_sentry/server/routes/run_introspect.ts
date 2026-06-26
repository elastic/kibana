/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import { ERROR_SENTRY_INTROSPECT_WORKFLOW_ID } from '../../common/constants';

export const registerRunIntrospectRoute = (
  router: IRouter,
  getServices: () => { managedClient: PluginScopedManagedWorkflowsApi }
) => {
  router.post(
    {
      path: '/internal/error_sentry/run_introspect',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      const { managedClient } = getServices();
      const executionId = await managedClient.execute(request, ERROR_SENTRY_INTROSPECT_WORKFLOW_ID, {
        spaceId: request.spaceId ?? 'default',
        triggeredBy: 'error-sentry-setup',
      });
      return response.ok({ body: { executionId } });
    }
  );
};
