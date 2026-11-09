/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  toWorkflowExecutionEngineModel,
  WorkflowsManagementOperationPrivileges,
} from '@kbn/workflows';
import {
  isScheduleOnlyAutomation,
  MANUAL_AUTOMATION_TRIGGER_SOURCE,
} from '../../../common/automation_run';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { validateScheduledAutomation } from '../../lib/automations/validate_scheduled_automation';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const runAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/automations/{id}/run',
  options: {
    access: 'internal',
    summary: 'Run a scheduled automation',
    description: 'Requests a manual run of a schedule-only automation using its saved workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: ['manage_nightshift', ...WorkflowsManagementOperationPrivileges.execute],
    },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({ id: z.string().min(1).max(512) }),
      body: z.strictObject({}).nullish(),
    })
  ),
  handler: async ({
    request,
    params,
    getAutomationsSoClient,
    getWorkflowsManagement,
    getInvestigatorServiceAccountService,
    context,
  }) => {
    const workflowsManagement = getWorkflowsManagement();
    if (!workflowsManagement) throw serverUnavailable('Workflows management is not available');
    const { management } = workflowsManagement;
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const { attributes: automation } = await getAutomationsSoClient(
      request,
      spaceId
    ).get<NightshiftAutomationAttributes>(NIGHTSHIFT_AUTOMATION_SO_TYPE, params.path.id);
    if (!automation.isEnabled) {
      throw badRequest('Enable the automation before running it manually.');
    }
    if (!isScheduleOnlyAutomation(automation)) {
      throw badRequest(
        'Only automations with a schedule trigger and no other triggers can be run manually.'
      );
    }
    validateScheduledAutomation(automation);
    const serviceAccountId = await getInvestigatorServiceAccountService().resolveAutomationRunAs(
      request,
      spaceId
    );
    const { workflowId } = automation;
    if (!workflowId)
      throw badRequest('The backing workflow is missing. Save the automation again to repair it.');
    const workflow = await management.getWorkflow(workflowId, spaceId, request);
    if (!workflow?.definition || !workflow.valid) {
      throw badRequest(
        'The backing workflow is missing or invalid. Save the automation again to repair it.'
      );
    }
    if (!serviceAccountId || workflow.definition.settings?.run_as !== serviceAccountId) {
      throw badRequest(
        'The backing workflow is not bound to the Nightshift automations service account. Set up Nightshift service accounts and save the automation again.'
      );
    }
    if (!workflow.enabled) {
      throw badRequest(
        'The backing workflow is disabled. Save the automation again before running it.'
      );
    }
    const workflowExecutionId = await management.runWorkflow(
      toWorkflowExecutionEngineModel(workflow),
      spaceId,
      {},
      request,
      MANUAL_AUTOMATION_TRIGGER_SOURCE
    );
    return { workflowExecutionId };
  },
});
