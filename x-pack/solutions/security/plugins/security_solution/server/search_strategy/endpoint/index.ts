/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, from, forkJoin, of } from 'rxjs';
import { omit } from 'lodash';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { KbnServerError } from '@kbn/kibana-utils-plugin/server';
import { shouldUseInternalSearchClient } from '../../endpoint/utils/cps_read_routing';
import { NotFoundError, ENDPOINT_AUTHZ_ERROR_MESSAGE } from '../../endpoint/errors';
import { fetchActionRequestById } from '../../endpoint/services/actions/utils/fetch_action_request_by_id';
import type {
  EndpointStrategyParseResponseType,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
  EndpointFactoryQueryTypes,
} from '../../../common/search_strategy/endpoint';
import type { EndpointFactory } from './factory/types';

import type { EndpointAppContext } from '../../endpoint/types';
import { endpointFactory } from './factory';

/** An empty index list classifies as not Defend-owned, which keeps the search on the internal user */
const resolveIndices = (index: string | string[] | undefined): string[] => {
  if (Array.isArray(index)) {
    return index.flatMap((entry) => entry.split(','));
  }

  return typeof index === 'string' ? index.split(',') : [];
};

/**
 * Stands in for a search that was never sent. Carries no `aggregations`, which every factory parser
 * already degrades from, so what the caller receives is indistinguishable from a no-data search.
 */
const noResults = <T extends EndpointFactoryQueryTypes>(): EndpointStrategyParseResponseType<T> =>
  ({
    rawResponse: {
      took: 0,
      timed_out: false,
      _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    },
    isPartial: false,
    isRunning: false,
    total: 0,
    loaded: 0,
  } as unknown as EndpointStrategyParseResponseType<T>);

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
        scoped: from(endpointContext.service.asScoped(deps.request)),
      }).pipe(
        mergeMap(({ authz, ccsEnabled, scoped }) => {
          if (!authz.canAccessEndpointActionsLogManagement) {
            throw new KbnServerError(ENDPOINT_AUTHZ_ERROR_MESSAGE, 403);
          }

          const { service } = endpointContext;
          const cpsRead = scoped.isCpsRead();
          const spaceId = cpsRead ? scoped.getSpaceId() : undefined;
          const actionId = 'actionId' in request ? request.actionId : undefined;
          const queryFactory: EndpointFactory<T> = endpointFactory[request.factoryQueryType];
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            sort: request.sort,
            // A fanned-out read does not also search CCS remotes, matching `routes/policy/service.ts`
            // and `services/metadata/endpoint_metadata_service.ts`: the two topologies are not meant
            // to be enabled together, and a `*:` remote expression alongside `project_routing` is not
            // a shape Elasticsearch has been verified to accept. Resolved here rather than in each
            // factory's DSL builder so both of them inherit it from the predicate that also picks the
            // client. Both currently resolve to Endpoint indices, so `cpsRead` implies they fan out —
            // the same assumption `cancel` below already rests on.
            ccsEnabled: ccsEnabled && !cpsRead,
            ...(spaceId ? { spaceId } : {}),
            ...('alertIds' in request ? { alertIds: request.alertIds } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
            ...('expiration' in request ? { expiration: request.expiration } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('agents' in request ? { agents: request.agents } : {}),
          } as EndpointStrategyRequestType<T>;
          const dsl = queryFactory.buildDsl(strictRequest, { authz });
          const useInternalUser = shouldUseInternalSearchClient(resolveIndices(dsl.index), cpsRead);

          const runSearch = () =>
            useInternalUser
              ? es.search({ ...strictRequest, params: dsl }, options, deps)
              : scoped
                  .getSearchClient()
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
          const isVisibleInSpace$ =
            spaceId && !useInternalUser && actionId
              ? from(
                  fetchActionRequestById(service, spaceId, actionId, {
                    scoped,
                  }).then(
                    () => true,
                    (err) => {
                      if (err instanceof NotFoundError) {
                        return false;
                      }

                      throw err;
                    }
                  )
                )
              : of(true);

          return isVisibleInSpace$.pipe(
            // An action the caller cannot see resolves to no results rather than an error. Every
            // other way this data can go missing degrades to empty, and the consumers of this
            // strategy poll on a loop while they hold no data. Nothing is sent to Elasticsearch:
            // this query counts responses in a `global` aggregation, which a query cannot bound.
            mergeMap((isVisibleInSpace) => (isVisibleInSpace ? runSearch() : of(noResults<T>()))),
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
      // Async search ids belong to whoever issued them, and there is no DSL here to re-derive the
      // routing from. No factory query currently resolves to a Fleet index, so with CPS on the
      // search this id belongs to went out on the scoped client.
      const scoped = await endpointContext.service.asScoped(deps.request);
      if (scoped.isCpsRead()) {
        // `options.strategy` names this strategy; forwarding it unchanged would cause the scoped
        // client to dispatch straight back into this cancel, producing infinite recursion. Override
        // it the same way the search path does. `projectRouting` is also dropped so the routing
        // remains the one the scoped client derives from the active space.
        return scoped.getSearchClient().cancel(id, {
          ...omit(options, 'projectRouting'),
          strategy: ENHANCED_ES_SEARCH_STRATEGY,
        });
      }

      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
