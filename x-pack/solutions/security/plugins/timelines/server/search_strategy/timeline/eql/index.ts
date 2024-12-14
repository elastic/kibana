/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs';
import { ISearchStrategy, PluginStart, shimHitsTotal } from '@kbn/data-plugin/server';
import { EqlSearchStrategyResponse, EQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { TimelineEqlRequestOptions } from '../../../../common/api/search_strategy';
import { EqlSearchResponse } from '../../../../common/search_strategy';
import { TimelineEqlResponse } from '../../../../common/search_strategy/timeline/events/eql';
import { buildEqlDsl, parseEqlResponse } from './helpers';
import { parseOptions } from './parse_options';

export const timelineEqlSearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<TimelineEqlRequestOptions, TimelineEqlResponse> => {
  const esEql = data.search.getSearchStrategy(EQL_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      const parsedOptions = parseOptions(request);
      const dsl = buildEqlDsl(parsedOptions);

      return esEql.search({ ...request, params: dsl }, options, deps).pipe(
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse),
            },
          };
        }),
        mergeMap(async (esSearchRes) =>
          parseEqlResponse(
            parsedOptions,
            esSearchRes as unknown as EqlSearchStrategyResponse<EqlSearchResponse<unknown>>
          )
        )
      );
    },
    cancel: async (id, options, deps) => {
      if (esEql.cancel) {
        return esEql.cancel(id, options, deps);
      }
    },
  };
};
