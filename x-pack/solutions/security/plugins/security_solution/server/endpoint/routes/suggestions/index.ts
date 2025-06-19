/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { RequestHandler } from '@kbn/core/server';
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
import { buildIndexNameWithNamespace } from '../../../../common/endpoint/utils/index_name_utilities';

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
        getEndpointSuggestionsRequestHandler(config$, endpointContext)
      )
    );
}

export const getEndpointSuggestionsRequestHandler = (
  config$: Observable<ConfigSchema>,
  endpointContext: EndpointAppContext
): RequestHandler<
  TypeOf<typeof EndpointSuggestionsSchema.params>,
  never,
  EndpointSuggestionsBody,
  SecuritySolutionRequestHandlerContext
> => {
  return async (context, request, response) => {
    const logger = endpointContext.logFactory.get('suggestions');
    const { field: fieldName, query, filters, fieldMeta } = request.body;
    let index = '';

    try {
      const config = await firstValueFrom(config$);

      if (request.params.suggestion_type === 'eventFilters') {
        if (!endpointContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
          index = eventsIndexPattern;
        } else {
          logger.debug('Using space-aware index pattern');

          const spaceId = (await context.securitySolution).getSpaceId();
          const integrationNamespaces = await endpointContext.service
            .getInternalFleetServices(spaceId)
            .getIntegrationNamespaces(['endpoint']);

          const namespaces = integrationNamespaces.endpoint;
          if (!namespaces || !namespaces.length) {
            logger.error('Failed to retrieve current space index patterns');
            return response.badRequest({
              body: 'Failed to retrieve current space index patterns',
            });
          }

          const indexPattern = namespaces
            .map((namespace) =>
              buildIndexNameWithNamespace(eventsIndexPattern, namespace, { preserveWildcard: true })
            )
            .join(',');

          if (indexPattern) {
            logger.debug(`Index pattern to be used: ${indexPattern}`);
            index = indexPattern;
          } else {
            logger.error('Failed to retrieve current space index patterns');
            return response.badRequest({
              body: 'Failed to retrieve current space index patterns',
            });
          }
        }
      } else {
        return response.badRequest({
          body: `Invalid suggestion_type: ${request.params.suggestion_type}`,
        });
      }

      const abortSignal = getRequestAbortedSignal(request.events.aborted$);
      const { savedObjects, elasticsearch } = await context.core;

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
