/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const ENDPOINT = '/internal/nightshift/investigations/service_account';
// Ids are opaque: `kibana/<name>` on stateful, a generated id on Serverless.
const SERVICE_ACCOUNT_ID_MAX_LENGTH = 1024;

// Creating the role and account and binding the workflow are each authorized by Elasticsearch
// and the workflows plugin against `manage_security`; route privileges cannot express a cluster
// privilege, so the route only requires an authenticated user.
const DELEGATED_AUTHZ = {
  authz: {
    enabled: false as const,
    reason:
      'Delegates to Elasticsearch and the workflows plugin, which require manage_security for service account creation and workload binding',
  },
};

export const getInvestigatorServiceAccountRoute = createNightshiftInvestigationsServerRoute({
  endpoint: `GET ${ENDPOINT}`,
  options: {
    access: 'internal',
    summary: 'Get whether Nightshift is set up with its service account in this space',
  },
  // Readable by every Nightshift user, so each sees the setup step and whether they may change
  // automations, whether or not their role also grants Agent Builder.
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  handler: async ({ request, getInvestigatorServiceAccountService, getSpaceId }) =>
    getInvestigatorServiceAccountService().getStatus(request, getSpaceId(request)),
});

export const enableInvestigatorServiceAccountRoute = createNightshiftInvestigationsServerRoute({
  endpoint: `POST ${ENDPOINT}/_enable`,
  options: {
    access: 'internal',
    summary: 'Set up Nightshift in this space with its service account',
  },
  security: DELEGATED_AUTHZ,
  params: lazySchema(() =>
    z.object({
      body: z.object({
        // Found or created by the caller (`ensureNightshiftServiceAccounts`); only the service
        // accounts backend assigns them, so they cannot be derived from the account names.
        serviceAccountIds: z.object({
          agent: z.string().min(1).max(SERVICE_ACCOUNT_ID_MAX_LENGTH),
          automations: z.string().min(1).max(SERVICE_ACCOUNT_ID_MAX_LENGTH),
        }),
      }),
    })
  ),
  handler: async ({ request, params, getInvestigatorServiceAccountService, getSpaceId }) =>
    getInvestigatorServiceAccountService().enable(
      request,
      getSpaceId(request),
      params.body.serviceAccountIds
    ),
});

export const disableInvestigatorServiceAccountRoute = createNightshiftInvestigationsServerRoute({
  endpoint: `POST ${ENDPOINT}/_disable`,
  options: {
    access: 'internal',
    summary: 'Remove the Nightshift service account setup from this space',
  },
  security: DELEGATED_AUTHZ,
  handler: async ({ request, getInvestigatorServiceAccountService, getSpaceId }) =>
    getInvestigatorServiceAccountService().disable(request, getSpaceId(request)),
});
