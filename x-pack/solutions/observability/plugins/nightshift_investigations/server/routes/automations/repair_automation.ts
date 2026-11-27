/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, serverUnavailable } from '@hapi/boom';
import { savedObjectId, z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import { generateWorkflowYaml } from '../../lib/automations/generate_workflow_yaml';
import { isAutomationWorkflowMissing } from '../../lib/automations/is_automation_workflow_missing';
import { automationCompletionSchema } from '../../lib/automations/schemas';
import { validateScheduledAutomation } from '../../lib/automations/validate_scheduled_automation';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const repairAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/automations/{id}/repair',
  options: {
    access: 'internal',
    summary: 'Repair an automation',
    description: 'Recreates a missing backing workflow and leaves the automation paused.',
  },
  security: { authz: { requiredPrivileges: ['manage_nightshift'] } },
  params: lazySchema(() =>
    z.object({
      path: z.object({ id: savedObjectId() }),
      body: z.strictObject({}).nullish(),
    })
  ),
  handler: async ({
    request,
    params,
    getAutomationsSoClient,
    getWorkflowsManagement,
    getInvestigatorServiceAccountService,
    isUniversalAlertingAvailable,
    context,
    logger,
  }) => {
    const workflows = getWorkflowsManagement();
    if (!workflows) throw serverUnavailable('Workflows management is not available');
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);
    const { id } = params.path;
    const existing = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      id
    );
    const serviceAccountId = await getInvestigatorServiceAccountService().resolveAutomationRunAs(
      request,
      spaceId
    );
    if (
      !(await isAutomationWorkflowMissing(
        existing.attributes.workflowId,
        spaceId,
        request,
        getWorkflowsManagement
      ))
    ) {
      return { id, ...existing.attributes };
    }
    const completions = automationCompletionSchema
      .array()
      .max(10)
      .safeParse(existing.attributes.completions);
    if (!completions.success) throw badRequest(completions.error.message);
    const automation = {
      ...existing.attributes,
      completions: completions.data,
      isEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    validateScheduledAutomation(automation);
    const replacement = await workflows.management.createWorkflow(
      {
        yaml: generateWorkflowYaml({
          automationId: id,
          automation,
          serviceAccountId,
          universalAlerts: isUniversalAlertingAvailable(),
        }),
      },
      spaceId,
      request
    );
    try {
      await soClient.update<NightshiftAutomationAttributes>(
        NIGHTSHIFT_AUTOMATION_SO_TYPE,
        id,
        {
          workflowId: replacement.id,
          isEnabled: false,
          updatedAt: automation.updatedAt,
        },
        { version: existing.version }
      );
    } catch (error) {
      try {
        const result = await workflows.management.deleteWorkflows(
          [replacement.id],
          spaceId,
          request
        );
        if (result.failures.length > 0) throw new Error('Replacement cleanup failed');
      } catch {
        logger.warn(
          `Could not remove disabled replacement ${replacement.id} for automation ${id} in space ${spaceId}`
        );
      }
      throw error;
    }
    return { id, ...automation, workflowId: replacement.id };
  },
});
