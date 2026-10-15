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
  /** Absent until the service account has been created. */
  service_account_id?: string;
  created_at?: string;
}

const toResponse = (
  uiamEnabled: boolean,
  access: SandboxElasticsearchAccess | undefined
): SandboxElasticsearchAccessResponse => ({
  uiam_enabled: uiamEnabled,
  ...(access ? { service_account_id: access.serviceAccountId, created_at: access.createdAt } : {}),
});

const getSandboxElasticsearchAccessRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox/elasticsearch_access',
  options: {
    access: 'internal',
    summary: 'Get sandbox Elasticsearch access',
    description:
      'Returns the UIAM service account the Nightshift sandbox queries this project as, if one has been created.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({
    sandboxElasticsearchAccessClient,
  }): Promise<SandboxElasticsearchAccessResponse> =>
    toResponse(
      sandboxElasticsearchAccessClient.isEnabled(),
      await sandboxElasticsearchAccessClient.get()
    ),
});

const ensureSandboxElasticsearchAccessRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/sandbox/elasticsearch_access',
  options: {
    access: 'internal',
    summary: 'Ensure sandbox Elasticsearch access',
    description:
      'Creates the UIAM service account the Nightshift sandbox queries this project as, unless it exists. Creating it uses the caller credentials and requires the manage_security cluster privilege.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({}),
  handler: async ({
    request,
    sandboxElasticsearchAccessClient,
  }): Promise<SandboxElasticsearchAccessResponse> => {
    try {
      return toResponse(true, await sandboxElasticsearchAccessClient.ensure(request));
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
