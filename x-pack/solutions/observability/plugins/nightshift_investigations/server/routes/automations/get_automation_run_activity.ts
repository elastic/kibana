/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { z, lazySchema } from '@kbn/zod/v4';
import { getBoundInvestigationWorkflowId } from '../../lib/service_account/constants';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const getAutomationRunActivityRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/{id}/run_activity',
  options: {
    access: 'internal',
    summary: 'Get automation run activity',
    description: 'Checks for active executions independently of the run-history time range.',
  },
  security: { authz: { requiredPrivileges: ['read_nightshift'] } },
  params: lazySchema(() =>
    z.object({
      path: z.object({ id: z.string().min(1).max(512) }),
      query: z.object({ executionId: z.string().min(1).max(512).optional() }).optional(),
    })
  ),
  handler: async ({ request, params, context, getAutomationsSoClient, getWorkflowsManagement }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) throw serverUnavailable('Workflows management is not available');
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const { attributes } = await getAutomationsSoClient(
      request,
      spaceId
    ).get<NightshiftAutomationAttributes>(NIGHTSHIFT_AUTOMATION_SO_TYPE, params.path.id);
    const { workflowId } = attributes;
    if (!workflowId) return { isRunning: false, executionId: undefined };

    const { management } = workflowsManagement;
    const executionId = params.query?.executionId;
    const [executions, requestedExecutions] = await Promise.all([
      management.getWorkflowExecutions(
        {
          workflowId,
          statuses: [...NonTerminalExecutionStatuses],
          omitStepRuns: true,
          page: 1,
          size: 1,
          request,
        },
        spaceId
      ),
      // Read the accepted execution directly: search may not see it until the index refreshes.
      executionId
        ? management.getWorkflowExecutionStatuses([executionId], spaceId, { request })
        : Promise.resolve([]),
    ]);
    const requestedExecution = requestedExecutions.find(
      (execution) => execution.workflowId === workflowId
    );
    if (
      executions.total > 0 ||
      (requestedExecution && NonTerminalExecutionStatuses.includes(requestedExecution.status))
    ) {
      return { isRunning: true, executionId: requestedExecution?.id };
    }

    // Dispatch finishes before its investigation. Follow the accepted run directly to bridge
    // the search-refresh gap when the investigation has only just been created.
    if (requestedExecution) {
      const dispatch = await management.getWorkflowExecution(requestedExecution.id, spaceId, {
        includeOutput: true,
        request,
      });
      const output = dispatch?.stepExecutions?.find(
        (step) => step.stepId === 'trigger_investigation'
      )?.output;
      if (
        output &&
        typeof output === 'object' &&
        'execution_id' in output &&
        typeof output.execution_id === 'string'
      ) {
        const [investigation] = await management.getWorkflowExecutionStatuses(
          [output.execution_id],
          spaceId,
          { request }
        );
        if (
          investigation?.workflowId === getBoundInvestigationWorkflowId(spaceId) &&
          NonTerminalExecutionStatuses.includes(investigation.status)
        ) {
          return { isRunning: true, executionId: requestedExecution.id };
        }
      }
    }

    // Also detect runs started by another browser or a schedule. Only inspect active
    // investigation entry points, never the automation's potentially unbounded history.
    let searchAfter: Parameters<typeof management.getWorkflowExecutions>[0]['searchAfter'];
    do {
      const investigations = await management.getWorkflowExecutions(
        {
          workflowId: getBoundInvestigationWorkflowId(spaceId),
          statuses: [...NonTerminalExecutionStatuses],
          omitStepRuns: true,
          size: 20,
          searchAfter,
          request,
        },
        spaceId
      );
      const snapshots = await Promise.all(
        investigations.results.map(({ id }) =>
          management.getWorkflowExecution(id, spaceId, { omitStepExecutions: true, request })
        )
      );
      const isRunning = snapshots.some((execution) => {
        if (!execution || !NonTerminalExecutionStatuses.includes(execution.status)) return false;
        const inputs = execution.context?.inputs;
        const inputContext =
          inputs && typeof inputs === 'object' && 'context' in inputs ? inputs.context : undefined;
        return (
          inputContext &&
          typeof inputContext === 'object' &&
          'nightshift_automation_id' in inputContext &&
          inputContext.nightshift_automation_id === params.path.id
        );
      });
      if (isRunning) return { isRunning: true, executionId: requestedExecution?.id };
      searchAfter = investigations.searchAfter?.map((value) => {
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          return value;
        }
        throw new Error('Invalid workflow execution cursor');
      });
    } while (searchAfter);
    return { isRunning: false, executionId: undefined };
  },
});
