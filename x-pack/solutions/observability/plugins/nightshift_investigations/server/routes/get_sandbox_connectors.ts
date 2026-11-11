/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { GetSandboxConnectorsResponse } from '../../common/sandbox_connectors';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getSandboxConnectorsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox_connectors',
  options: {
    access: 'internal',
    summary: 'List sandbox connectors',
    description:
      'Returns the connectors the investigation agent can use from its sandbox in the current ' +
      'space: the sandbox-capable connectors the caller can read.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: lazySchema(() => z.object({})),
  handler: async ({ request, listSandboxConnectors }): Promise<GetSandboxConnectorsResponse> => ({
    connectors: await listSandboxConnectors(request),
  }),
});
