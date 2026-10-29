/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { API_PATHS, API_VERSION } from '../../common/constants';
import {
  appParamsSchema,
  appSchema,
  createAppRequestSchema,
  listAppsResponseSchema,
  updateAppRequestSchema,
} from '../../common/schemas/apps';
import { deleteQuerySchema, entityListQuerySchema } from '../../common/schemas/common';
import {
  credentialParamsSchema,
  listCredentialsResponseSchema,
  rotateCredentialRequestSchema,
  rotateCredentialResponseSchema,
} from '../../common/schemas/credentials';
import type { GetServices } from '../types';
import {
  ERROR_RESPONSES,
  MANAGE_SECURITY,
  READ_SECURITY,
  ROUTE_OPTIONS,
  handleErrors,
} from './route_utils';

export const registerAppsRoutes = (router: IRouter, getServices: GetServices) => {
  router.versioned
    .get({
      path: API_PATHS.apps,
      access: 'public',
      summary: 'List feature flag apps',
      description: 'Returns the apps that evaluate feature flags, sorted by key.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: entityListQuerySchema },
          response: { 200: { body: () => listAppsResponseSchema, description: 'The apps.' } },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { apps } = await getServices();
          const { page, per_page: perPage } = request.query;
          return response.ok({ body: await apps.list({ page, perPage }) });
        })
    );

  router.versioned
    .post({
      path: API_PATHS.apps,
      access: 'public',
      summary: 'Create a feature flag app',
      description:
        'Creates an app, for example `kibana`. Flags are assigned to apps, and an app evaluates flags with the credentials of an environment.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { body: createAppRequestSchema },
          response: {
            200: { body: () => appSchema, description: 'The created app.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { apps } = await getServices();
          return response.ok({ body: await apps.create(request, request.body) });
        })
    );

  router.versioned
    .get({
      path: API_PATHS.app,
      access: 'public',
      summary: 'Get a feature flag app',
      description: 'Returns one app by key.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: appParamsSchema },
          response: {
            200: { body: () => appSchema, description: 'The app.' },
            ...ERROR_RESPONSES.notFound,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { apps } = await getServices();
          return response.ok({ body: await apps.get(request.params.app) });
        })
    );

  router.versioned
    .put({
      path: API_PATHS.app,
      access: 'public',
      summary: 'Update a feature flag app',
      description:
        'Replaces the name and description of an app. The key cannot change. Pass the `version` you read to fail with 409 if someone else changed it since.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: appParamsSchema, body: updateAppRequestSchema },
          response: {
            200: { body: () => appSchema, description: 'The updated app.' },
            ...ERROR_RESPONSES.validation,
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { apps } = await getServices();
          return response.ok({
            body: await apps.update(request, request.params.app, request.body),
          });
        })
    );

  router.versioned
    .delete({
      path: API_PATHS.app,
      access: 'public',
      summary: 'Delete a feature flag app',
      description:
        'Deletes an app and all of its credentials. Fails with 409 while a flag is assigned to the app.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: appParamsSchema, query: deleteQuerySchema },
          response: {
            204: { description: 'The app was deleted.' },
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { apps } = await getServices();
          await apps.delete(request, request.params.app, { version: request.query.version });
          return response.noContent();
        })
    );

  router.versioned
    .get({
      path: API_PATHS.appCredentials,
      access: 'public',
      summary: 'List the credentials of a feature flag app',
      description:
        'Returns the credentials of an app, at most one per environment. SDK keys are never returned; only their last characters are.',
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: appParamsSchema },
          response: {
            200: { body: () => listCredentialsResponseSchema, description: 'The credentials.' },
            ...ERROR_RESPONSES.notFound,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { credentials } = await getServices();
          return response.ok({ body: { items: await credentials.list(request.params.app) } });
        })
    );

  router.versioned
    .post({
      path: API_PATHS.appCredentialRotate,
      access: 'public',
      summary: 'Generate or rotate the SDK key of a feature flag app',
      description:
        'Generates the credentials of an app for an environment, or replaces the SDK key if they exist. The response is the only time the SDK key is returned: Kibana stores only its SHA-256 hash. The previous SDK key stops working once Fleet Server picks up the change.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: credentialParamsSchema, body: rotateCredentialRequestSchema },
          response: {
            200: {
              body: () => rotateCredentialResponseSchema,
              description: 'The credential and its new SDK key.',
            },
            ...ERROR_RESPONSES.notFound,
            ...ERROR_RESPONSES.conflict,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { credentials } = await getServices();
          const { app, environment } = request.params;
          return response.ok({
            body: await credentials.rotate(request, {
              app,
              environment,
              rotateClientId: request.body?.rotate_client_id ?? false,
            }),
          });
        })
    );

  router.versioned
    .delete({
      path: API_PATHS.appCredential,
      access: 'public',
      summary: 'Revoke the credentials of a feature flag app',
      description:
        'Deletes the SDK key and client ID of an app for an environment. They stop working once Fleet Server picks up the change.',
      security: MANAGE_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { params: credentialParamsSchema },
          response: {
            204: { description: 'The credentials were revoked.' },
            ...ERROR_RESPONSES.notFound,
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { credentials } = await getServices();
          const { app, environment } = request.params;
          await credentials.delete(request, app, environment);
          return response.noContent();
        })
    );
};
