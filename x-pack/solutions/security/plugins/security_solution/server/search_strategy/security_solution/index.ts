/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, from, concatAll } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { z } from '@kbn/zod';
import type { ISearchRequestParams } from '@kbn/search-types';
import { EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT } from '../../../common/constants';
import { searchStrategyRequestSchema } from '../../../common/api/search_strategy';
import { securitySolutionFactory } from './factory';
import type { EndpointAppContext } from '../../endpoint/types';

// TODO move this to a better place
const EXCLUDE_COLD_FROZEN_TIERS_FILTER = {
  bool: {
    must_not: {
      terms: {
        _tier: ['data_frozen', 'data_cold'],
      },
    },
  },
};

export const securitySolutionSearchStrategyProvider = (
  data: PluginStart,
  endpointContext: EndpointAppContext,
  getSpaceId?: (request: KibanaRequest) => string,
  ruleDataClient?: IRuleDataClient | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ISearchStrategy<z.input<typeof searchStrategyRequestSchema>, any> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const parsedRequest = searchStrategyRequestSchema.parse(request);
      const queryFactory = securitySolutionFactory[parsedRequest.factoryQueryType];
      // NOTE: without this parameter, .hits.hits can be empty
      options.retrieveResults = true;

      // Provide the ability to exclude cold and frozen tiers
      const dslPromise: Promise<ISearchRequestParams> = deps?.uiSettingsClient
        .get<boolean>(EXCLUDE_COLD_AND_FROZEN_TIERS_IN_ENTITY_FLYOUT)
        .then((excludeColdFrozenTier) => {
          return queryFactory.buildDsl(parsedRequest, {
            coldFrozenTierFilter: excludeColdFrozenTier
              ? EXCLUDE_COLD_FROZEN_TIERS_FILTER
              : undefined,
          });
        });

      return from(dslPromise).pipe(
        map((dsl) => {
          return es.search({ ...request, params: dsl }, options, deps);
        }),
        concatAll(),
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse, options),
            },
          };
        }),
        mergeMap(async (esSearchRes) => {
          const dsl = await dslPromise;
          return queryFactory.parse(parsedRequest, esSearchRes, {
            esClient: deps.esClient,
            savedObjectsClient: deps.savedObjectsClient,
            endpointContext,
            request: deps.request,
            spaceId: getSpaceId && getSpaceId(deps.request),
            ruleDataClient,
            dsl,
          });
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
