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

export const listAutomationsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/automations',
  options: {
    access: 'internal',
    summary: 'List automations',
    description: 'Returns all nightshift automations in the current space.',
  },
  security: {
    authz: { requiredPrivileges: ['read_nightshift'] },
  },
  params: z.object({}),
  handler: async ({ request, getAutomationsSoClient, context }) => {
    const spaceId =
      (await context.core).savedObjects.client.getCurrentNamespace() ?? DEFAULT_SPACE_ID;
    const soClient = getAutomationsSoClient(request, spaceId);

    // TODO: add cursor-based pagination before GA (perPage: 1000 is a temporary ceiling)
    const result = await soClient.find<NightshiftAutomationAttributes>({
      type: NIGHTSHIFT_AUTOMATION_SO_TYPE,
      perPage: 1000,
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return {
      automations: result.saved_objects.map((so) => ({
        id: so.id,
        ...so.attributes,
      })),
      total: result.total,
    };
  },
});
