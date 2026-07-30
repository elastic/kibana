/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, from, forkJoin } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { shouldUseInternalSearchClient } from '../../endpoint/utils/cps_read_routing';
import type {
  EndpointStrategyParseResponseType,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
  EndpointFactoryQueryTypes,
} from '../../../common/search_strategy/endpoint';
import type { EndpointFactory } from './factory/types';

import type { EndpointAppContext } from '../../endpoint/types';
import { ENDPOINT_AUTHZ_ERROR_MESSAGE } from '../../endpoint/errors';
import { endpointFactory } from './factory';

/** An unknown index list classifies as not Defend-owned, which keeps the search on the internal user */
const resolveIndices = (index: unknown): string[] => {
  if (Array.isArray(index)) {
    return index.flatMap((entry) => String(entry).split(','));
  }

  return typeof index === 'string' ? index.split(',') : [];
};

export const endpointSearchStrategyProvider = <T extends EndpointFactoryQueryTypes>(
  data: PluginStart,
  endpointContext: EndpointAppContext
): ISearchStrategy<EndpointStrategyRequestType<T>, EndpointStrategyResponseType<T>> => {
  const es = data.search.searchAsInternalUser as unknown as ISearchStrategy<
    EndpointStrategyRequestType<T>,
    EndpointStrategyParseResponseType<T>
  >;

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      return forkJoin({
        authz: from(endpointContext.service.getEndpointAuthz(deps.request)),
        ccsEnabled: endpointContext.service.isCcsEnabled(),
      }).pipe(
        mergeMap(({ authz, ccsEnabled }) => {
          if (!authz.canAccessEndpointActionsLogManagement) {
            throw new KbnServerError(ENDPOINT_AUTHZ_ERROR_MESSAGE, 403);
          }

          const { service } = endpointContext;
          const queryFactory: EndpointFactory<T> = endpointFactory[request.factoryQueryType];
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            sort: request.sort,
            ccsEnabled,
            ...('alertIds' in request ? { alertIds: request.alertIds } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
            ...('expiration' in request ? { expiration: request.expiration } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('agents' in request ? { agents: request.agents } : {}),
          } as EndpointStrategyRequestType<T>;
          const dsl = queryFactory.buildDsl(strictRequest, { authz });
          const useInternalUser = shouldUseInternalSearchClient(
            resolveIndices(dsl.index),
            service.isCpsEnabled()
          );

          const searchResults$ = useInternalUser
            ? es.search({ ...strictRequest, params: dsl }, options, deps)
            : service
                .getScopedSearchClient(deps.request)
                .search<EndpointStrategyRequestType<T>, EndpointStrategyParseResponseType<T>>(
                  { ...strictRequest, params: dsl },
                  // `options.strategy` names this strategy; leaving it in place would recurse
                  { ...options, strategy: ENHANCED_ES_SEARCH_STRATEGY }
                );

          return searchResults$.pipe(
            map((response) => {
              return {
                ...response,
                ...{
                  rawResponse: shimHitsTotal(response.rawResponse, options),
                },
              };
            }),
            mergeMap((esSearchRes) =>
              queryFactory.parse(request, esSearchRes, {
                authz,
              })
            )
          );
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
