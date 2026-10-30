/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import type { RequestHandlerContext } from '@kbn/core/server';
import { NIGHTSHIFT_API_PRIVILEGES, NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH,
  type GetSandboxAllowlistResponse,
  type PutSandboxAllowlistResponse,
} from '../../common/sandbox_allowlist';
import {
  SandboxAllowlistDisabledError,
  SandboxAllowlistValidationError,
} from '../sandbox_allowlist';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const assertNightshiftEnabled = async (context: RequestHandlerContext): Promise<void> => {
  const { featureFlags } = await context.core;
  if (!(await featureFlags.getBooleanValue(NIGHTSHIFT_ENABLED_FLAG, false))) {
    throw new SandboxAllowlistDisabledError();
  }
};

export const rethrowSandboxAllowlistError = (error: unknown): never => {
  if (error instanceof SandboxAllowlistDisabledError) {
    throw notFound();
  }
  if (error instanceof SandboxAllowlistValidationError) {
    throw badRequest(error.message);
  }
  throw error;
};

// Both routes require manage: the allowlist is an admin setting, and only the server reads it at
// command time (the sandbox and the agent never see it).
const getSandboxAllowlistRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/sandbox_allowlist',
  options: {
    access: 'internal',
    summary: 'Get the sandbox credential host allowlist',
    description:
      'Returns the hosts that may receive real connector and sandbox secret values from sandbox commands in the current space.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: lazySchema(() => z.object({})),
  handler: async ({
    context,
    request,
    sandboxAllowlistClient,
  }): Promise<GetSandboxAllowlistResponse> => {
    try {
      await assertNightshiftEnabled(context);
      return await sandboxAllowlistClient.get(request);
    } catch (error) {
      return rethrowSandboxAllowlistError(error);
    }
  },
});

const putSandboxAllowlistRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/sandbox_allowlist',
  options: {
    access: 'internal',
    summary: 'Replace the sandbox credential host allowlist',
    description:
      'Replaces the hosts that may receive real connector and sandbox secret values from sandbox commands in the current space. Entries must be exact hostnames; wildcards are not supported.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: lazySchema(() =>
    z.object({
      body: z.object({
        // Only size bounds here, as a DoS guard; the hostname rules (and the exact host limit,
        // which applies after de-duplication) live in validateSandboxAllowlist.
        hosts: z
          .array(z.string().max(MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH))
          .max(MAX_SANDBOX_ALLOWLIST_HOSTS * 4),
      }),
    })
  ),
  handler: async ({
    context,
    request,
    params,
    sandboxAllowlistClient,
  }): Promise<PutSandboxAllowlistResponse> => {
    try {
      await assertNightshiftEnabled(context);
      return await sandboxAllowlistClient.replace(request, params.body);
    } catch (error) {
      return rethrowSandboxAllowlistError(error);
    }
  },
});

export const sandboxAllowlistRoutes = {
  ...getSandboxAllowlistRoute,
  ...putSandboxAllowlistRoute,
};
