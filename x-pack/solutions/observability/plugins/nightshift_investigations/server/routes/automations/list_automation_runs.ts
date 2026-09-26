/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound, serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const listAutomationRunsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/{id}/runs',
  options: {
    access: 'internal',
    summary: 'List automation runs',
    description: 'Returns run history for a nightshift automation.',
  },
  security: {
    authz: { requiredPrivileges: ['manage_nightshift', 'read_nightshift'] },
  },
  params: z.object({
    path: z.object({ id: z.string().min(1) }),
    query: z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      size: z.coerce.number().int().min(1).max(100).optional().default(20),
    }),
  }),
  handler: async ({
    request,
    params,
    getAutomationsSoClient,
    getWorkflowsManagement,
    context,
  }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) {
      throw serverUnavailable('Workflows management is not available');
    }

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const so = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id
    );
    if (!so) {
      throw notFound(`Automation ${params.path.id} not found`);
    }

    if (!so.attributes.workflowId) {
      return { runs: [], total: 0, page: params.query.page, size: params.query.size };
    }

    const executions = await workflowsManagement.management.getWorkflowExecutions(
      {
        workflowId: so.attributes.workflowId,
        omitStepRuns: true,
        page: params.query.page,
        size: params.query.size,
      },
      spaceId
    );

    const runs = executions.results.map((exec) => ({
      id: exec.id,
      status: exec.status,
      startedAt: exec.startedAt,
      finishedAt: exec.finishedAt,
      duration: exec.duration,
      triggeredBy: exec.triggeredBy,
      // investigation_id is available via the trigger_investigation step output.
      // Fetching it requires a per-execution detail call; deferred to the detail endpoint.
    }));

    return {
      runs,
      total: executions.total,
      page: executions.page,
      size: executions.size,
    };
  },
});
