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
import { termsAggSuggestions } from '@kbn/unified-search-plugin/server/autocomplete/terms_agg';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
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
  METADATA_UNITED_INDEX,
} from '../../../../common/endpoint/constants';
import { withEndpointAuthz } from '../with_endpoint_authz';
import { errorHandler } from '../error_handler';
import { buildIndexNameWithNamespace } from '../../../../common/endpoint/utils/index_name_utilities';
import { buildBaseEndpointMetadataFilter } from '../../../../common/endpoint/utils/endpoint_metadata_filter';

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
      const { savedObjects, elasticsearch } = await context.core;
      const securitySolutionContext = await context.securitySolution;
      const spaceId = securitySolutionContext.getSpaceId();
      const isSpaceAwarenessEnabled =
        endpointContext.experimentalFeatures.endpointManagementSpaceAwarenessEnabled;
      let fullFilters: QueryDslQueryContainer[] = filters
        ? [...(filters as QueryDslQueryContainer[])]
        : [];
      let suggestionMethod: typeof termsEnumSuggestions | typeof termsAggSuggestions =
        termsEnumSuggestions;

      if (request.params.suggestion_type === 'eventFilters') {
        if (!isSpaceAwarenessEnabled) {
          index = eventsIndexPattern;
        } else {
          logger.debug('Using space-aware index pattern');

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
      } else if (request.params.suggestion_type === 'endpoints') {
        suggestionMethod = termsAggSuggestions;
        index = METADATA_UNITED_INDEX;

        const agentPolicyIds: string[] = [];
        const fleetService = securitySolutionContext.getInternalFleetServices();
        const endpointPackagePolicies = await fleetService.packagePolicy.fetchAllItems(
          savedObjects.client,
          {
            kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:endpoint`,
            spaceIds: isSpaceAwarenessEnabled ? [spaceId] : ['*'],
          }
        );
        for await (const batch of endpointPackagePolicies) {
          const batchAgentPolicyIds = batch.flatMap((policy) => policy.policy_ids);
          agentPolicyIds.push(...batchAgentPolicyIds);
        }

        const baseFilters = buildBaseEndpointMetadataFilter(agentPolicyIds);
        fullFilters = [...fullFilters, baseFilters];
      } else {
        return response.badRequest({
          body: `Invalid suggestion_type: ${request.params.suggestion_type}`,
        });
      }

      const abortSignal = getRequestAbortedSignal(request.events.aborted$);

      const body = await suggestionMethod(
        config,
        savedObjects.client,
        elasticsearch.client.asInternalUser,
        index,
        fieldName,
        query,
        fullFilters,
        fieldMeta,
        abortSignal
      );
      return response.ok({ body });
    } catch (error) {
      return errorHandler(logger, response, error);
    }
  };
};
