/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { API_PATHS, API_VERSION } from '../../common/constants';
import { deleteQuerySchema, entityListQuerySchema } from '../../common/schemas/common';
import {
  createEnvironmentRequestSchema,
  environmentParamsSchema,
  environmentSchema,
  listEnvironmentsResponseSchema,
  updateEnvironmentRequestSchema,
} from '../../common/schemas/environments';
import type { GetServices } from '../types';
import {
  ERROR_RESPONSES,
  MANAGE_SECURITY,
  READ_SECURITY,
  ROUTE_OPTIONS,
  handleErrors,
} from './route_utils';

export const registerEnvironmentsRoutes = (router: IRouter, getServices: GetServices) => {
  router.versioned
    .get({
      path: API_PATHS.environments,
      access: 'public',
      summary: 'List feature flag environments',
      description: 'Returns the environments that flags can be configured for, sorted by key.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: entityListQuerySchema },
          response: {
            200: { body: () => listEnvironmentsResponseSchema, description: 'The environments.' },
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { environments } = await getServices();
          const { page, per_page: perPage } = request.query;
          return response.ok({ body: await environments.list({ page, perPage }) });
        })
    );

  router.versioned
    .post({
      path: API_PATHS.environments,
      access: 'public',
      summary: 'Create a feature flag environment',
      description:
        'Creates an environment, for example `production`. Each flag defines its evaluation rules per environment, and each app gets one set of credentials per environment.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { body: createEnvironmentRequestSchema },
          response: {
            200: { body: () => environmentSchema, description: 'The created environment.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { environments } = await getServices();
          return response.ok({ body: await environments.create(request, request.body) });
        })
    );

  router.versioned
    .get({
      path: API_PATHS.environment,
      access: 'public',
      summary: 'Get a feature flag environment',
      description: 'Returns one environment by key.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: environmentParamsSchema },
          response: {
            200: { body: () => environmentSchema, description: 'The environment.' },
            ...ERROR_RESPONSES.notFound,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { environments } = await getServices();
          return response.ok({ body: await environments.get(request.params.environment) });
        })
    );

  router.versioned
    .put({
      path: API_PATHS.environment,
      access: 'public',
      summary: 'Update a feature flag environment',
      description:
        'Replaces the name and description of an environment. The key cannot change. Pass the `version` you read to fail with 409 if someone else changed it since.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: environmentParamsSchema, body: updateEnvironmentRequestSchema },
          response: {
            200: { body: () => environmentSchema, description: 'The updated environment.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { environments } = await getServices();
          return response.ok({
            body: await environments.update(request, request.params.environment, request.body),
          });
        })
    );

  router.versioned
    .delete({
      path: API_PATHS.environment,
      access: 'public',
      summary: 'Delete a feature flag environment',
      description:
        'Deletes an environment and every app credential for it. Fails with 409 while a flag has evaluation rules for the environment.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: environmentParamsSchema, query: deleteQuerySchema },
          response: {
            204: { description: 'The environment was deleted.' },
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { environments } = await getServices();
          await environments.delete(request, request.params.environment, {
            version: request.query.version,
          });
          return response.noContent();
        })
    );
};
