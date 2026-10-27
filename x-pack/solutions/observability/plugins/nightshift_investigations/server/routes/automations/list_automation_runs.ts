/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ExecutionStatus } from '@kbn/workflows';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';
import { readAutomationUsage } from '../../lib/automations/automation_budget';

const mapRunStatus = (status: ExecutionStatus): 'succeeded' | 'running' | 'failed' | 'skipped' => {
  if (status === ExecutionStatus.COMPLETED) return 'succeeded';
  if (status === ExecutionStatus.SKIPPED) return 'skipped';
  if (
    status === ExecutionStatus.PENDING ||
    status === ExecutionStatus.WAITING ||
    status === ExecutionStatus.WAITING_FOR_INPUT ||
    status === ExecutionStatus.WAITING_FOR_CHILD ||
    status === ExecutionStatus.RUNNING ||
    status === ExecutionStatus.QUEUED
  ) {
    return 'running';
  }
  return 'failed';
};

export const listAutomationRunsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/{id}/runs',
  options: {
    access: 'internal',
    summary: 'List automation runs',
    description:
      'Returns run history and current UTC-day dispatch usage for a nightshift automation.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  params: z.object({
    path: z.object({ id: z.string().min(1).max(512) }),
    query: z.object({
      page: z.coerce.number().int().min(1).optional().default(1),
      size: z.coerce.number().int().min(1).max(100).optional().default(20),
      startedAfter: z.string().max(64).optional(),
      startedBefore: z.string().max(64).optional(),
    }),
  }),
  handler: async ({ request, params, getAutomationsSoClient, getWorkflowsManagement, context }) => {
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
    const usedToday = await readAutomationUsage(soClient, params.path.id);
    if (!so.attributes.workflowId) {
      return { runs: [], total: 0, usedToday, page: params.query.page, size: params.query.size };
    }

    const executions = await workflowsManagement.management.getWorkflowExecutions(
      {
        workflowId: so.attributes.workflowId,
        omitStepRuns: true,
        page: params.query.page,
        size: params.query.size,
        startedAfter: params.query.startedAfter,
        startedBefore: params.query.startedBefore,
        request,
      },
      spaceId
    );

    const { workflowId } = so.attributes;
    const stepExecutions = await Promise.all(
      [
        'trigger_investigation',
        'trigger_alert_investigation',
        'trigger_investigation_alert',
        'trigger_investigation_slack',
        'follow_up_recovered_alert',
      ].map((stepId) =>
        workflowsManagement.management.searchStepExecutions(
          {
            workflowId,
            stepId,
            workflowExecutionIds: executions.results.map(({ id }) => id),
            includeInput: true,
            includeOutput: true,
            page: 1,
            size: Math.max(executions.results.length, 1),
            sourceIncludes: ['workflowRunId', 'input', 'output'],
            request,
          },
          spaceId
        )
      )
    );
    const [defaultSteps, legacyAlertSteps, alertSteps, slackSteps, recoveredAlertSteps] =
      stepExecutions.map(
        ({ results }) => new Map(results.map((step) => [step.workflowRunId, step]))
      );

    const runs = executions.results.map((exec) => {
      const step =
        (exec.triggeredBy === 'alerting.v1.alertStatusChanged'
          ? alertSteps.get(exec.id) ??
            legacyAlertSteps.get(exec.id) ??
            recoveredAlertSteps.get(exec.id)
          : exec.triggeredBy === 'slack2.message'
          ? slackSteps.get(exec.id)
          : undefined) ?? defaultSteps.get(exec.id);
      const input =
        step?.input && !Array.isArray(step.input) && typeof step.input === 'object'
          ? step.input
          : {};
      const output =
        step?.output && !Array.isArray(step.output) && typeof step.output === 'object'
          ? step.output
          : {};
      const getString = (value: unknown) => (typeof value === 'string' ? value : undefined);

      const dailyLimitReached = output['skip_reason'] === 'daily_limit';
      const noOpenInvestigation = output['skip_reason'] === 'no_open_investigation';

      return {
        id: exec.id,
        status:
          dailyLimitReached || noOpenInvestigation
            ? ('skipped' as const)
            : mapRunStatus(exec.status),
        startedAt: exec.startedAt,
        finishedAt: exec.finishedAt,
        duration: exec.duration,
        triggeredBy: exec.triggeredBy,
        title: getString(input['title']),
        message: getString(input['message']),
        investigationId: getString(output['investigation_id']),
        skipReason: dailyLimitReached
          ? 'daily_limit'
          : noOpenInvestigation
          ? 'no_open_investigation'
          : null,
        dailyLimit:
          typeof output['daily_limit'] === 'number'
            ? output['daily_limit']
            : so.attributes.runtime.dailyDispatchLimit,
      };
    });

    return {
      runs,
      total: executions.total,
      usedToday,
      page: executions.page,
      size: executions.size,
    };
  },
});
