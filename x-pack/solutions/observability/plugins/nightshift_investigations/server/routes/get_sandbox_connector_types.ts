/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type { GetSandboxConnectorTypesResponse } from '../../common/sandbox_connectors';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const getSandboxConnectorTypesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox_connector_types',
  options: {
    access: 'internal',
    summary: 'List sandbox connector types',
    description:
      'Returns the connector types the investigation agent can use from its sandbox: the ' +
      'sandbox-capable ones.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: lazySchema(() => z.object({})),
  handler: async ({
    request,
    listSandboxConnectorTypes,
  }): Promise<GetSandboxConnectorTypesResponse> => ({
    connector_types: await listSandboxConnectorTypes(request),
  }),
});
