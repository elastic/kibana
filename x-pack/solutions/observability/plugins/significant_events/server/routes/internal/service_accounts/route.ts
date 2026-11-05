/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  DetectionEngineEnableBody,
  DetectionEngineServiceAccountStatus,
} from '../../../../common';
import { createDetectionEngineSetupService } from '../../../lib/service_accounts/service_account_setup';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';

// Ids are opaque: `kibana/<name>` on stateful, a generated id on Serverless.
const SERVICE_ACCOUNT_ID_MAX_LENGTH = 1024;

const enableServiceAccountRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/service_account/_enable',
  options: {
    access: 'internal',
    summary: 'Set up the detection engine in this space to run as its service account',
    description:
      'Binds the deployment-wide detection service account to this space. Requires the manage_security cluster privilege and an existing role for the account; Nightshift never creates the role.',
  },
  // Binding is authorized by Elasticsearch against `manage_security`. Route privileges cannot
  // express a cluster privilege, so the handler checks it and the route only requires a user.
  security: {
    authz: {
      enabled: false,
      reason:
        'Delegates to Elasticsearch and Core, which require manage_security for workload binding',
    },
  },
  params: lazySchema(() =>
    z.object({
      body: z.object({
        serviceAccountId: z.string().min(1).max(SERVICE_ACCOUNT_ID_MAX_LENGTH),
      }),
    })
  ),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    getSpaceId,
  }): Promise<{ spaceId: string } & DetectionEngineEnableBody> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return createDetectionEngineSetupService({
      core: server.core,
      spaces: server.spaces,
      isServerless: server.isServerless,
    }).enable({
      request,
      spaceId: await getSpaceId(request),
      serviceAccountId: params.body.serviceAccountId,
    });
  },
});

const getServiceAccountStatusRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/service_account',
  options: {
    access: 'internal',
    summary: 'Get the detection engine service account setup of this space',
    description:
      'Returns the account the space runs as, or null when it is not set up, the role the account must hold and whether the current user can set the space up.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() => z.object({})),
  handler: async ({
    request,
    server,
    getScopedClients,
    getSpaceId,
  }): Promise<DetectionEngineServiceAccountStatus> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return createDetectionEngineSetupService({
      core: server.core,
      spaces: server.spaces,
      isServerless: server.isServerless,
    }).getStatus({ request, spaceId: await getSpaceId(request) });
  },
});

export const internalServiceAccountRoutes = {
  ...enableServiceAccountRoute,
  ...getServiceAccountStatusRoute,
};
