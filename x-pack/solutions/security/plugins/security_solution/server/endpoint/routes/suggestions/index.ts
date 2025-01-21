/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { RequestHandler, Logger } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import type { ConfigSchema } from '@kbn/unified-search-plugin/server/config';
import { termsEnumSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_enum';
import {
  type EndpointSuggestionsBody,
  EndpointSuggestionsSchema,
} from '../../../../common/api/endpoint';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import {
  eventsIndexPattern,
  SUGGESTIONS_INTERNAL_ROUTE,
} from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';

export const getLogger = (endpointAppContext: EndpointAppContext): Logger => {
  return endpointAppContext.logFactory.get('suggestions');
};

export function registerEndpointSuggestionsRoutes(
  router: SecuritySolutionPluginRouter,
  config$: Observable<ConfigSchema>,
  endpointContext: EndpointAppContext
) {
  router.versioned
    .post({
      access: 'internal',
      path: SUGGESTIONS_INTERNAL_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: EndpointSuggestionsSchema,
        },
      },
      withEndpointAuthz(
        { any: ['canWriteEventFilters'] },
        endpointContext.logFactory.get('endpointSuggestions'),
        getEndpointSuggestionsRequestHandler(config$, getLogger(endpointContext))
      )
    );
}

export const getEndpointSuggestionsRequestHandler = (
  config$: Observable<ConfigSchema>,
  logger: Logger
): RequestHandler<
  TypeOf<typeof EndpointSuggestionsSchema.params>,
  never,
  EndpointSuggestionsBody,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    const config = await firstValueFrom(config$);
    const { field: fieldName, query, filters, fieldMeta } = request.body;
    let index = '';

    if (request.params.suggestion_type === 'eventFilters') {
      index = eventsIndexPattern;
    } else {
      return response.badRequest({
        body: `Invalid suggestion_type: ${request.params.suggestion_type}`,
      });
    }

    const abortSignal = getRequestAbortedSignal(request.events.aborted$);
    const { savedObjects, elasticsearch } = await context.core;
    try {
      const body = await termsEnumSuggestions(
        config,
        savedObjects.client,
        elasticsearch.client.asInternalUser,
        index,
        fieldName,
        query,
        filters,
        fieldMeta,
        abortSignal
      );
      return response.ok({ body });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
