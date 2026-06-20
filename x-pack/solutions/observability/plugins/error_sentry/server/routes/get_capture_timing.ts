/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { ERROR_SENTRY_CAPTURE_WORKFLOW_ID } from '../../common/constants';

const CAPTURE_SCHEDULE_MS = 24 * 60 * 60 * 1000;

export const registerGetCaptureTimingRoute = (
  router: IRouter,
  getManagement: () => WorkflowsManagementApi
) => {
  router.get(
    {
      path: '/internal/error_sentry/capture_timing',
      validate: false,
      security: {
        authz: { enabled: false, reason: 'Access is controlled by Kibana feature privileges' },
      },
    },
    async (_context, request, response) => {
      try {
        const management = getManagement();
        const spaceId = request.spaceId ?? 'default';

        const result = await management.getWorkflowExecutions(
          {
            workflowId: ERROR_SENTRY_CAPTURE_WORKFLOW_ID,
            size: 10,
            sortField: 'finishedAt',
            sortOrder: 'desc',
          },
          spaceId
        );

        const lastRun = result.results[0]?.finishedAt ?? null;

        // Only compute next run from scheduled executions — a manual run doesn't
        // reset the scheduler's 24h clock.
        const lastScheduled = result.results.find((e) => e.triggeredBy === 'scheduled');
        const nextRun = lastScheduled
          ? new Date(new Date(lastScheduled.finishedAt).getTime() + CAPTURE_SCHEDULE_MS).toISOString()
          : null;

        return response.ok({ body: { lastRun, nextRun } });
      } catch {
        return response.ok({ body: { lastRun: null, nextRun: null } });
      }
    }
  );
};
