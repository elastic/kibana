/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { API_PATHS, API_VERSION } from '../../common/constants';
import {
  listObservedContextsQuerySchema,
  listObservedContextsResponseSchema,
  observedAttributesQuerySchema,
  observedAttributesResponseSchema,
  observedValuesQuerySchema,
  observedValuesResponseSchema,
} from '../../common/schemas/observed_contexts';
import type { GetServices } from '../types';
import { READ_SECURITY, ROUTE_OPTIONS, handleErrors } from './route_utils';

const OBSERVED_CONTEXTS_DESCRIPTION =
  'Fleet Server reports the evaluation contexts it receives when `observed_contexts` is enabled in its `feature_flags_service` settings.';

export const registerObservedContextsRoutes = (router: IRouter, getServices: GetServices) => {
  router.versioned
    .get({
      path: API_PATHS.observedContextAttributes,
      access: 'public',
      summary: 'Suggest evaluation context attributes',
      description: `Returns the most common attribute names in the evaluation contexts of an app and environment, with the JSON types seen for each. ${OBSERVED_CONTEXTS_DESCRIPTION}`,
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: observedAttributesQuerySchema },
          response: {
            200: { body: () => observedAttributesResponseSchema, description: 'The attributes.' },
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { observedContexts } = await getServices();
          return response.ok({ body: await observedContexts.attributes(request.query) });
        })
    );

  router.versioned
    .get({
      path: API_PATHS.observedContextValues,
      access: 'public',
      summary: 'Suggest evaluation context values',
      description: `Returns the most common values of one attribute in the evaluation contexts of an app and environment. ${OBSERVED_CONTEXTS_DESCRIPTION}`,
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: observedValuesQuerySchema },
          response: {
            200: { body: () => observedValuesResponseSchema, description: 'The values.' },
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { observedContexts } = await getServices();
          return response.ok({ body: await observedContexts.values(request.query) });
        })
    );

  router.versioned
    .get({
      path: API_PATHS.observedContexts,
      access: 'public',
      summary: 'List observed evaluation contexts',
      description: `Returns full evaluation contexts of an app and environment, most recently seen first, or the one with a given \`context_key\`. ${OBSERVED_CONTEXTS_DESCRIPTION}`,
      security: READ_SECURITY,
      options: ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: { query: listObservedContextsQuerySchema },
          response: {
            200: { body: () => listObservedContextsResponseSchema, description: 'The contexts.' },
          },
        },
      },
      async (context, request, response) =>
        handleErrors(response, async () => {
          const { observedContexts } = await getServices();
          const { context_key: contextKey, per_page: perPage, ...scope } = request.query;
          return response.ok({
            body: await observedContexts.list({ ...scope, contextKey, perPage }),
          });
        })
    );
};
