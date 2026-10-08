/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getMemoryAvailabilityRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/memory/availability',
  options: {
    access: 'internal',
    summary: 'Check whether Semantic Memory is enabled',
    description:
      'Reports xpack.nightshift_investigations.memory.enabled so the UI can hide the ' +
      'Semantic Memory view when it is off. The flag defaults to false.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:read'] },
  },
  params: z.object({}),
  handler: async ({ isMemoryEnabled }) => {
    return { enabled: isMemoryEnabled() };
  },
});
