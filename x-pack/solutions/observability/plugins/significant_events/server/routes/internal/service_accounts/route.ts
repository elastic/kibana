/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import {
  createServiceAccountSetupService,
  type DetectionEngineServiceAccountIds,
} from '../../../lib/service_accounts/service_account_setup';
import type { SignificantEventsMaintenanceSummary } from '../../../../common/maintenance/types';

// Ids are opaque: `kibana/<name>` on stateful, a generated id on Serverless.
const SERVICE_ACCOUNT_ID_MAX_LENGTH = 1024;

// Binding a workflow to a service account is authorized by Elasticsearch and the workflows plugin
// against `manage_security`; route privileges cannot express a cluster privilege, so the handler
// checks it and the route only requires an authenticated user.
const DELEGATED_AUTHZ = {
  authz: {
    enabled: false as const,
    reason:
      'Delegates to Elasticsearch and the workflows plugin, which require manage_security for workload binding',
  },
};

const enableServiceAccountsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/service_account/_enable',
  options: {
    access: 'internal',
    summary: 'Set up the detection engine in this space to run as its service accounts',
  },
  security: DELEGATED_AUTHZ,
  params: z.object({
    body: z.object({
      serviceAccountIds: z.object({
        detectionEngine: z.string().min(1).max(SERVICE_ACCOUNT_ID_MAX_LENGTH),
      }),
    }),
  }),
  handler: async ({
    params,
    request,
    server,
    getScopedClients,
    getSpaceId,
    workflowClients,
    maintenanceService,
  }): Promise<{
    spaceId: string;
    serviceAccountIds: DetectionEngineServiceAccountIds;
    rules: { reassigned: number; failedIds: string[] };
  }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return createServiceAccountSetupService({
      core: server.core,
      spaces: server.spaces,
      workflowsExtensions: server.workflowsExtensions,
      onboardingClient: workflowClients.streamsKIsOnboardingClient,
      getScopedClients,
      maintenanceService,
    }).enable({
      request,
      spaceId: await getSpaceId(request),
      serviceAccountIds: params.body.serviceAccountIds,
    });
  },
});

const disableServiceAccountsRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/service_account/_disable',
  options: {
    access: 'internal',
    summary: 'Remove the detection engine service account setup from this space',
  },
  security: DELEGATED_AUTHZ,
  params: z.object({}),
  handler: async ({
    request,
    server,
    getScopedClients,
    getSpaceId,
    workflowClients,
    maintenanceService,
  }): Promise<{ spaceId: string; pause: SignificantEventsMaintenanceSummary }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    return createServiceAccountSetupService({
      core: server.core,
      spaces: server.spaces,
      workflowsExtensions: server.workflowsExtensions,
      onboardingClient: workflowClients.streamsKIsOnboardingClient,
      getScopedClients,
      maintenanceService,
    }).disable({ request, spaceId: await getSpaceId(request) });
  },
});

export const internalServiceAccountRoutes = {
  ...enableServiceAccountsRoute,
  ...disableServiceAccountsRoute,
};
