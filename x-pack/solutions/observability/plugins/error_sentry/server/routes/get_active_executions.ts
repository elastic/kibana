/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
  ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
} from '../../common/constants';

export const registerGetActiveExecutionsRoute = (
  router: IRouter,
  getManagement: () => WorkflowsManagementApi
) => {
  router.get(
    {
      path: '/internal/error_sentry/active_executions',
      validate: {
        query: schema.object({
          since: schema.string(),
        }),
      },
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      try {
        const management = getManagement();
        const spaceId = request.spaceId ?? 'default';
        const { since } = request.query;

        const [captureResult, ralphResult] = await Promise.all([
          management.getWorkflowExecutions(
            {
              workflowId: ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
              statuses: [...NonTerminalExecutionStatuses],
              startedAfter: since,
              size: 10,
              sortField: 'createdAt',
              sortOrder: 'desc',
            },
            spaceId
          ),
          management.getWorkflowExecutions(
            {
              workflowId: ERROR_SENTRY_RALPH_INVESTIGATION_WORKFLOW_ID,
              statuses: [...NonTerminalExecutionStatuses],
              startedAfter: since,
              size: 50,
              sortField: 'createdAt',
              sortOrder: 'desc',
            },
            spaceId
          ),
        ]);

        const hasActiveExecutions =
          captureResult.results.length > 0 || ralphResult.results.length > 0;

        return response.ok({ body: { hasActiveExecutions } });
      } catch {
        return response.ok({ body: { hasActiveExecutions: false } });
      }
    }
  );
};
