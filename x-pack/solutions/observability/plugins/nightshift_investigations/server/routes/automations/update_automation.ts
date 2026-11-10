/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectId, z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { automationUpdateSchema } from '../../lib/automations/automation_update';

export const updateAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/automations/{id}',
  options: {
    access: 'internal',
    summary: 'Update an automation',
    description: 'Updates an automation and reconciles its generated workflow.',
  },
  security: { authz: { requiredPrivileges: ['manage_nightshift'] } },
  params: lazySchema(() =>
    z.object({ path: z.object({ id: savedObjectId() }), body: automationUpdateSchema })
  ),
  handler: async ({ request, params, getAutomationWorkflowService, context }) => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    return getAutomationWorkflowService().update(request, spaceId, params.path.id, params.body);
  },
});
