/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { AUTOMATION_LIST_FIND_OPTIONS } from './list_automations';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const getAutomationsLastRunsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/last_runs',
  options: {
    access: 'internal',
    summary: 'Get the latest run start time for automations',
    description:
      'Returns the start time of the latest readable workflow execution for each automation.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  params: lazySchema(() => z.object({})),
  handler: async ({ request, getAutomationsSoClient, getWorkflowsManagement, context }) => {
    const management = getWorkflowsManagement()?.management;
    if (!management) {
      throw serverUnavailable('Workflows management is not available');
    }

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);
    const { saved_objects: automations } = await soClient.find<NightshiftAutomationAttributes>({
      ...AUTOMATION_LIST_FIND_OPTIONS,
      fields: ['workflowId'],
    });
    const workflowIdByAutomationId = new Map(
      automations.flatMap((automation) =>
        automation.attributes.workflowId
          ? [[automation.id, automation.attributes.workflowId] as const]
          : []
      )
    );
    const workflowIds = [...new Set(workflowIdByAutomationId.values())];
    const { results } = workflowIds.length
      ? await management.searchExecutionsView(
          {
            request,
            includeManagedExecutions: true,
            query: {
              bool: {
                filter: [
                  { terms: { workflowId: workflowIds } },
                  { exists: { field: 'startedAt' } },
                ],
              },
            },
            sortField: 'startedAt',
            sortOrder: 'desc',
            collapse: 'workflowId',
            size: workflowIds.length,
          },
          spaceId
        )
      : { results: [] };
    const startedAtByWorkflowId = new Map(
      results.flatMap(({ workflowId, startedAt }) =>
        workflowId && startedAt ? [[workflowId, startedAt] as const] : []
      )
    );

    return {
      lastRuns: Object.fromEntries(
        Array.from(workflowIdByAutomationId).flatMap(([id, workflowId]) => {
          const startedAt = startedAtByWorkflowId.get(workflowId);
          return startedAt ? [[id, startedAt] as const] : [];
        })
      ),
    };
  },
});
