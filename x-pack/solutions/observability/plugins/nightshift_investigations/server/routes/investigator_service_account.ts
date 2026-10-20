/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const ENDPOINT = '/internal/nightshift/investigations/service_account';

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
  // Readable by anyone who can read investigations, so every Nightshift user sees the setup step.
  security: { authz: { requiredPrivileges: ['agentBuilder:read'] } },
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
  handler: async ({ request, getInvestigatorServiceAccountService, getSpaceId }) =>
    getInvestigatorServiceAccountService().enable(request, getSpaceId(request)),
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
