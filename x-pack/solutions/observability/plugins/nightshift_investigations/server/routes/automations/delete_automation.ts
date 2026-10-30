/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE } from '../../saved_objects/automation_budget_saved_object';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type { NightshiftAutomationAttributes } from '../../lib/automations/types';

export const deleteAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'DELETE /internal/nightshift/automations/{id}',
  options: {
    access: 'internal',
    summary: 'Delete an automation',
    description: 'Deletes a nightshift automation and its backing workflow document.',
  },
  security: {
    authz: { requiredPrivileges: ['manage_nightshift'] },
  },
  params: z.object({
    path: z.object({ id: z.string().min(1).max(512) }),
  }),
  handler: async ({ request, params, getAutomationsSoClient, getWorkflowsManagement, context }) => {
    const workflowsManagement = getWorkflowsManagement();

    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const existing = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id
    );

    // Delete the backing workflow first so it cannot fire after the SO is gone.
    if (workflowsManagement && existing.attributes.workflowId) {
      const { workflowId } = existing.attributes;
      const workflow = await workflowsManagement.management
        .getWorkflow(workflowId, spaceId, request)
        .catch(() => null);
      // Only a workflow read as unbound may outlive its automation. A workflow bound to a service
      // account keeps running as that account; so may one whose binding can't be read (lookup
      // failed, or the caller can't read it). For those, a failed delete fails the request and
      // keeps the automation. Deleting a workflow that no longer exists succeeds.
      const isKnownUnbound =
        Boolean(workflow?.definition) && !workflow?.definition?.settings?.run_as;
      if (!isKnownUnbound) {
        await workflowsManagement.management.deleteWorkflows([workflowId], spaceId, request);
      } else {
        // Best-effort: if workflow deletion fails the SO is still removed; an orphaned unbound
        // workflow is inert because the automation SO is the source of truth for routing.
        try {
          await workflowsManagement.management.deleteWorkflows([workflowId], spaceId, request);
        } catch {
          // Intentionally swallowed — the SO delete below is the authoritative cleanup.
        }
      }
    }

    try {
      await soClient.delete(NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE, params.path.id);
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) throw error;
    }
    await soClient.delete(NIGHTSHIFT_AUTOMATION_SO_TYPE, params.path.id);

    return {};
  },
});
