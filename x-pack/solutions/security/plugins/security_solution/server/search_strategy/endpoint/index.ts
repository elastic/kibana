/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, from, forkJoin } from 'rxjs';
import { omit } from 'lodash';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { shouldUseInternalSearchClient } from '../../endpoint/utils/cps_read_routing';
import { fetchActionRequestById } from '../../endpoint/services/actions/utils/fetch_action_request_by_id';
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

/** An empty index list classifies as not Defend-owned, which keeps the search on the internal user */
const resolveIndices = (index: string | string[] | undefined): string[] => {
  if (Array.isArray(index)) {
    return index.flatMap((entry) => entry.split(','));
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
          const cpsRead = service.isCpsRead(deps.request);
          const spaceId = cpsRead ? service.getActiveSpaceId(deps.request) : undefined;
          const actionId = 'actionId' in request ? request.actionId : undefined;
          const queryFactory: EndpointFactory<T> = endpointFactory[request.factoryQueryType];
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            sort: request.sort,
            ccsEnabled,
            ...(spaceId ? { spaceId } : {}),
            ...('alertIds' in request ? { alertIds: request.alertIds } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
            ...('expiration' in request ? { expiration: request.expiration } : {}),
            ...(actionId ? { actionId } : {}),
            ...('agents' in request ? { agents: request.agents } : {}),
          } as EndpointStrategyRequestType<T>;
          const dsl = queryFactory.buildDsl(strictRequest, { authz });
          const useInternalUser = shouldUseInternalSearchClient(resolveIndices(dsl.index), cpsRead);

          const runSearch = () =>
            useInternalUser
              ? es.search({ ...strictRequest, params: dsl }, options, deps)
              : service
                  .getScopedSearchClient(deps.request)
                  .search<EndpointStrategyRequestType<T>, EndpointStrategyParseResponseType<T>>(
                    { ...strictRequest, params: dsl },
                    // `options.strategy` names this strategy and would recurse. `projectRouting` is
                    // dropped so the routing stays the one this client derived from the active space.
                    {
                      ...omit(options, 'projectRouting'),
                      strategy: ENHANCED_ES_SEARCH_STRATEGY,
                    }
                  );

          // Response documents carry no space of their own and this query is keyed on an action id
          // the caller supplied, so the action itself has to be resolved, and space-checked, first.
          const boundedResults$ =
            spaceId && !useInternalUser && actionId
              ? from(
                  fetchActionRequestById(service, spaceId, actionId, { request: deps.request })
                ).pipe(mergeMap(runSearch))
              : runSearch();

          return boundedResults$.pipe(
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
