/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
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
    // Best-effort: if workflow deletion fails the SO is still removed; any orphaned
    // workflow will be inert because the automation SO is the source of truth for routing.
    if (workflowsManagement && existing.attributes.workflowId) {
      try {
        await workflowsManagement.management.deleteWorkflows(
          [existing.attributes.workflowId],
          spaceId,
          request
        );
      } catch {
        // Intentionally swallowed — the SO delete below is the authoritative cleanup.
      }
    }

    await soClient.delete(NIGHTSHIFT_AUTOMATION_SO_TYPE, params.path.id);

    return {};
  },
});
