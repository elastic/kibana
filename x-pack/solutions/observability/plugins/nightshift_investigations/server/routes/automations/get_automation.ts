/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectId, z, lazySchema } from '@kbn/zod/v4';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { createNightshiftInvestigationsServerRoute } from '../create_server_route';
import { isAutomationWorkflowMissing } from '../../lib/automations/is_automation_workflow_missing';
import { NIGHTSHIFT_AUTOMATION_SO_TYPE } from '../../saved_objects/automation_saved_object';
import type {
  NightshiftAutomationAttributes,
  NightshiftAutomationRecord,
} from '../../lib/automations/types';

export const getAutomationRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations/{id}',
  options: {
    access: 'internal',
    summary: 'Get an automation',
    description: 'Returns a single nightshift automation by ID.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({ id: savedObjectId() }),
    })
  ),
  handler: async ({
    request,
    params,
    getAutomationsSoClient,
    getWorkflowsManagement,
    context,
  }): Promise<NightshiftAutomationRecord & { author: string; isWorkflowMissing: boolean }> => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    const so = await soClient.get<NightshiftAutomationAttributes>(
      NIGHTSHIFT_AUTOMATION_SO_TYPE,
      params.path.id
    );

    const automation = {
      id: so.id,
      ...so.attributes,
      author: so.attributes.author ?? 'System',
    };
    const isWorkflowMissing = await isAutomationWorkflowMissing(
      automation.workflowId,
      spaceId,
      request,
      getWorkflowsManagement
    );
    return { ...automation, isWorkflowMissing };
  },
});
