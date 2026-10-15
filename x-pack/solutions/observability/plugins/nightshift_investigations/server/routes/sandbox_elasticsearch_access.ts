/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  SandboxElasticsearchAccessDisabledError,
  type SandboxElasticsearchAccess,
} from '../sandbox_elasticsearch_access';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export interface SandboxElasticsearchAccessResponse {
  /** `sandbox.elasticsearch.uiam.enabled`: the sandbox reaches Elasticsearch as a UIAM service account. */
  uiam_enabled: boolean;
  /** The space of the request; each space binds its own service account. */
  space_id: string;
  /** Absent until a service account has been bound in the space. */
  service_account_id?: string;
  bound_at?: string;
}

const toResponse = (
  uiamEnabled: boolean,
  spaceId: string,
  access: SandboxElasticsearchAccess | undefined
): SandboxElasticsearchAccessResponse => ({
  uiam_enabled: uiamEnabled,
  space_id: spaceId,
  ...(access ? { service_account_id: access.serviceAccountId, bound_at: access.boundAt } : {}),
});

const getSandboxElasticsearchAccessRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox/elasticsearch_access',
  options: {
    access: 'internal',
    summary: 'Get sandbox Elasticsearch access',
    description:
      'Returns the UIAM service account the Nightshift sandbox queries this project as in the current space, if one is bound.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({
    request,
    sandboxElasticsearchAccessClient,
  }): Promise<SandboxElasticsearchAccessResponse> => {
    const spaceId = sandboxElasticsearchAccessClient.getSpaceId(request);
    // Bindings need saved object encryption, which a deployment without UIAM mode may not have.
    if (!sandboxElasticsearchAccessClient.isEnabled()) {
      return toResponse(false, spaceId, undefined);
    }
    return toResponse(true, spaceId, await sandboxElasticsearchAccessClient.get(request));
  },
});

const ensureSandboxElasticsearchAccessRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/sandbox/elasticsearch_access',
  options: {
    access: 'internal',
    summary: 'Ensure sandbox Elasticsearch access',
    description:
      'Creates the UIAM service account the Nightshift sandbox queries this project as in the current space and binds it to the space, unless one is bound. Creating and binding use the caller credentials and require the manage_security cluster privilege.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({}),
  handler: async ({
    request,
    sandboxElasticsearchAccessClient,
  }): Promise<SandboxElasticsearchAccessResponse> => {
    try {
      const access = await sandboxElasticsearchAccessClient.ensure(request);
      return toResponse(true, access.spaceId, access);
    } catch (error) {
      if (error instanceof SandboxElasticsearchAccessDisabledError) {
        throw badRequest(error.message);
      }
      throw error;
    }
  },
});

export const sandboxElasticsearchAccessRoutes = {
  ...getSandboxElasticsearchAccessRoute,
  ...ensureSandboxElasticsearchAccessRoute,
};
