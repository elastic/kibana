/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import type {
  GetSandboxSecretsResponse,
  PutSandboxSecretsResponse,
} from '../../common/sandbox_secrets';
import {
  MAX_SANDBOX_SECRETS,
  MAX_SANDBOX_SECRETS_VERSION_LENGTH,
  MAX_SANDBOX_SECRET_KEY_LENGTH,
  MAX_SANDBOX_SECRET_VALUE_LENGTH,
  MIN_SANDBOX_SECRET_VALUE_LENGTH,
} from '../../common/sandbox_secrets';
import {
  SandboxSecretsConflictError,
  SandboxSecretsDisabledError,
  SandboxSecretsUnavailableError,
  SandboxSecretsValidationError,
} from '../sandbox_secrets';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const rethrowSandboxSecretsError = (error: unknown): never => {
  if (error instanceof SandboxSecretsDisabledError) {
    throw notFound();
  }
  if (
    error instanceof SandboxSecretsValidationError ||
    error instanceof SandboxSecretsUnavailableError
  ) {
    throw badRequest(error.message);
  }
  if (error instanceof SandboxSecretsConflictError) {
    throw conflict(error.message);
  }
  throw error;
};

const getSandboxSecretsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox_secrets',
  options: {
    access: 'internal',
    summary: 'List sandbox secret keys',
    description:
      'Returns the names of the sandbox secrets configured in the current space. Values are never returned.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({ request, sandboxSecretsClient }): Promise<GetSandboxSecretsResponse> => {
    try {
      return await sandboxSecretsClient.listKeys(request);
    } catch (error) {
      return rethrowSandboxSecretsError(error);
    }
  },
});

const putSandboxSecretsRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/sandbox_secrets',
  options: {
    access: 'internal',
    summary: 'Replace sandbox secrets',
    description:
      'Replaces the sandbox secrets of the current space. Entries without a value keep their stored value; keys not listed are removed.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    body: z.object({
      entries: z
        .array(
          z.object({
            key: z.string().max(MAX_SANDBOX_SECRET_KEY_LENGTH),
            value: z
              .string()
              .min(MIN_SANDBOX_SECRET_VALUE_LENGTH)
              .max(MAX_SANDBOX_SECRET_VALUE_LENGTH)
              .optional(),
          })
        )
        .max(MAX_SANDBOX_SECRETS),
      version: z.string().max(MAX_SANDBOX_SECRETS_VERSION_LENGTH).optional(),
    }),
  }),
  handler: async ({
    request,
    params,
    sandboxSecretsClient,
  }): Promise<PutSandboxSecretsResponse> => {
    try {
      return await sandboxSecretsClient.replaceEntries(request, params.body);
    } catch (error) {
      return rethrowSandboxSecretsError(error);
    }
  },
});

export const sandboxSecretsRoutes = {
  ...getSandboxSecretsRoute,
  ...putSandboxSecretsRoute,
};
