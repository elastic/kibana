/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { mapRunStatus } from './map_run_status';
import type { AutomationRunStatus } from './map_run_status';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

type RunCounts = Record<AutomationRunStatus, number>;

const emptyCounts = (): RunCounts => ({ succeeded: 0, running: 0, failed: 0, skipped: 0 });

export const getAutomationsRunCountsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/automations/run_counts',
  options: {
    access: 'internal',
    summary: 'Count automation runs by status',
    description:
      'Returns the exact number of runs per status for each requested automation, within an optional start time range.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  params: lazySchema(() =>
    z.object({
      body: z.object({
        ids: z.array(z.string().min(1).max(512)).min(1).max(100),
        startedAfter: z.string().max(64).optional(),
        startedBefore: z.string().max(64).optional(),
      }),
    })
  ),
  handler: async ({ request, params, getAutomationsSoClient, getWorkflowsManagement, context }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) {
      throw serverUnavailable('Workflows management is not available');
    }

    const { ids, startedAfter, startedBefore } = params.body;
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const { saved_objects: automations } = await soClient.bulkGet<NightshiftAutomationAttributes>(
      ids.map((id) => ({ type: NIGHTSHIFT_AUTOMATION_SO_TYPE, id }))
    );
    const workflowIdByAutomationId = new Map(
      automations.flatMap((automation) =>
        'attributes' in automation && automation.attributes.workflowId
          ? [[automation.id, automation.attributes.workflowId] as const]
          : []
      )
    );

    const countsByWorkflowId =
      await workflowsManagement.management.getWorkflowExecutionStatusCounts(
        {
          workflowIds: [...new Set(workflowIdByAutomationId.values())],
          startedAfter,
          startedBefore,
          request,
        },
        spaceId
      );

    const counts = Object.fromEntries(
      ids.map((id) => {
        const runCounts = emptyCounts();
        const workflowId = workflowIdByAutomationId.get(id);
        const statusCounts = (workflowId && countsByWorkflowId[workflowId]) || {};
        for (const status of Object.values(ExecutionStatus)) {
          runCounts[mapRunStatus(status)] += statusCounts[status] ?? 0;
        }
        return [id, runCounts];
      })
    );

    return { counts };
  },
});
