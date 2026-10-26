/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { API_PATHS, API_VERSION } from '../../common/constants';
import { deleteQuerySchema } from '../../common/schemas/common';
import {
  createFlagRequestSchema,
  flagHistoryQuerySchema,
  flagHistoryResponseSchema,
  flagParamsSchema,
  flagSchema,
  listFlagsQuerySchema,
  listFlagsResponseSchema,
  updateFlagRequestSchema,
} from '../../common/schemas/flags';
import type { GetServices } from '../types';
import {
  ERROR_RESPONSES,
  MANAGE_SECURITY,
  READ_SECURITY,
  ROUTE_OPTIONS,
  handleErrors,
} from './route_utils';

const VALIDATION_RULES_DESCRIPTION =
  'Kibana checks that the apps and environments exist, that variations are unique and match `value_type`, that every default, `return` and percentage key is a variation, that percentages add up to 100, and that prerequisites exist, are configured in the same environment, expect one of their own variations and form no cycle.';

export const registerFlagsRoutes = (router: IRouter, getServices: GetServices) => {
  router.versioned
    .get({
      path: API_PATHS.flags,
      access: 'public',
      summary: 'List feature flags',
      description: 'Returns flags sorted by key, optionally filtered.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: listFlagsQuerySchema },
          response: { 200: { body: () => listFlagsResponseSchema, description: 'The flags.' } },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          const { per_page: perPage, ...filters } = request.query;
          return response.ok({ body: await flags.list({ ...filters, perPage }) });
        })
    );

  router.versioned
    .post({
      path: API_PATHS.flags,
      access: 'public',
      summary: 'Create a feature flag',
      description: `Creates a flag with its variations and its evaluation rules per environment. ${VALIDATION_RULES_DESCRIPTION}`,
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { body: createFlagRequestSchema },
          response: {
            200: { body: () => flagSchema, description: 'The created flag.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          return response.ok({ body: await flags.create(request, request.body) });
        })
    );

  router.versioned
    .get({
      path: API_PATHS.flag,
      access: 'public',
      summary: 'Get a feature flag',
      description: 'Returns one flag by key.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: flagParamsSchema },
          response: {
            200: { body: () => flagSchema, description: 'The flag.' },
            ...ERROR_RESPONSES.notFound,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          return response.ok({ body: await flags.get(request.params.key) });
        })
    );

  router.versioned
    .put({
      path: API_PATHS.flag,
      access: 'public',
      summary: 'Update a feature flag',
      description: `Replaces a flag's definition and evaluation rules. The key cannot change. Pass the \`version\` you read to fail with 409 if someone else changed it since. ${VALIDATION_RULES_DESCRIPTION} Flags that use this one as a prerequisite must stay valid too.`,
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: flagParamsSchema, body: updateFlagRequestSchema },
          response: {
            200: { body: () => flagSchema, description: 'The updated flag.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          return response.ok({
            body: await flags.update(request, request.params.key, request.body),
          });
        })
    );

  router.versioned
    .delete({
      path: API_PATHS.flag,
      access: 'public',
      summary: 'Delete a feature flag',
      description:
        'Deletes a flag. Fails with 409 while another flag uses it as a prerequisite. Its change history is kept.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: flagParamsSchema, query: deleteQuerySchema },
          response: {
            204: { description: 'The flag was deleted.' },
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          await flags.delete(request, request.params.key, { version: request.query.version });
          return response.noContent();
        })
    );

  router.versioned
    .get({
      path: API_PATHS.flagHistory,
      access: 'public',
      summary: 'Get the change history of a feature flag',
      description:
        'Returns the changes made to a flag, newest first. Each entry has the flag as it was after that change. The history is kept after the flag is deleted.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: flagParamsSchema, query: flagHistoryQuerySchema },
          response: {
            200: { body: () => flagHistoryResponseSchema, description: 'The changes.' },
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { flags } = await getServices();
          const { page, per_page: perPage } = request.query;
          return response.ok({
            body: await flags.history(request.params.key, { page, perPage }),
          });
        })
    );
};
