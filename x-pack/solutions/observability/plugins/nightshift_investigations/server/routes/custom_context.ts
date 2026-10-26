/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import {
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH,
  MAX_CUSTOM_CONTEXT_VERSION_LENGTH,
  type GetCustomContextResponse,
  type PutCustomContextResponse,
} from '../../common/custom_context';
import {
  CustomContextConflictError,
  CustomContextDisabledError,
  CustomContextValidationError,
} from '../custom_context';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

export const rethrowCustomContextError = (error: unknown): never => {
  if (error instanceof CustomContextDisabledError) {
    throw notFound();
  }
  if (error instanceof CustomContextValidationError) {
    throw badRequest(error.message);
  }
  if (error instanceof CustomContextConflictError) {
    throw conflict(error.message);
  }
  throw error;
};

const getCustomContextRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/custom_context',
  options: {
    access: 'internal',
    summary: 'Get custom context',
    description:
      'Returns the custom context snippets of the current space. They are appended to the investigation agent system prompt.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read] } },
  params: z.object({}),
  handler: async ({ request, customContextClient }): Promise<GetCustomContextResponse> => {
    try {
      return await customContextClient.get(request);
    } catch (error) {
      return rethrowCustomContextError(error);
    }
  },
});

const putCustomContextRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/custom_context',
  options: {
    access: 'internal',
    summary: 'Replace custom context',
    description:
      'Replaces the custom context snippets of the current space. Snippets without an id are added; existing snippets not listed are removed.',
  },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    body: z.object({
      snippets: z
        .array(
          z.object({
            id: z.string().max(MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH).optional(),
            text: z.string().max(MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH),
          })
        )
        .max(MAX_CUSTOM_CONTEXT_SNIPPETS),
      version: z.string().max(MAX_CUSTOM_CONTEXT_VERSION_LENGTH).optional(),
    }),
  }),
  handler: async ({ request, params, customContextClient }): Promise<PutCustomContextResponse> => {
    try {
      return await customContextClient.replace(request, params.body);
    } catch (error) {
      return rethrowCustomContextError(error);
    }
  },
});

export const customContextRoutes = {
  ...getCustomContextRoute,
  ...putCustomContextRoute,
};
