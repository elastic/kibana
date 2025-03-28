/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { ESQL_ASYNC_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { z } from '@kbn/zod';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { searchStrategyRequestSchema } from '../../../common/api/search_strategy';
import type { EndpointAppContext } from '../../endpoint/types';
export const ENTITY_ANALYTICS_ESQL_SEARCH_STRATEGY = 'eaEsqlSearchStrategy';

const ESQL = `FROM commands-privtest
    | RENAME @timestamp AS event_timestamp
    | LOOKUP JOIN privileged-users ON user.name
    | RENAME event_timestamp AS @timestamp
    | EVAL is_privileged = COALESCE(labels.is_privileged, false)
    | WHERE is_privileged == true
    | STATS
        name = MAX(user.name),
        @timestamp = MAX(@timestamp)
        BY user.name
    | KEEP @timestamp, user.name`;

// implementation wrapping search strategy
export const entityAnalyticsEsqlSearchStrategyProvider = (
  data: PluginStart,
  endpointContext: EndpointAppContext,
  getSpaceId?: (request: KibanaRequest) => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ISearchStrategy<z.input<typeof searchStrategyRequestSchema>, any> => {
  const es = data.search.getSearchStrategy(ESQL_ASYNC_SEARCH_STRATEGY);
  return {
    search: (_, options, deps) => {
      return es.search(
        { params: { query: ESQL as unknown as QueryDslQueryContainer } }, // TODO fix cast when types are updated.
        options,
        deps
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};

// // This implement loose the async capability. It basically converts an async ES call to a sync kibana API.
// export const entityAnalyticsEsqlSearchStrategyProvider = (
//   data: PluginStart,
//   endpointContext: EndpointAppContext,
//   getSpaceId?: (request: KibanaRequest) => string
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
// ): ISearchStrategy<z.input<typeof searchStrategyRequestSchema>, any> => {
//   return {
//     search: (_, options, deps) => {
//       const { esClient } = deps;

//       return from(
//         esClient.asCurrentUser.esql
//           .asyncQuery(
//             {
//               columnar: false,
//               query: ESQL,
//             },
//             {
//               signal: options.abortSignal,
//               meta: true,
//               maxRetries: 0,
//               requestTimeout: options.transport?.requestTimeout,
//             }
//           )
//           .then((response) => {
//             const { body, headers, meta } = response;

//             return {
//               rawResponse: body,
//               isPartial: false,
//               isRunning: false,
//               ...(meta?.request?.params
//                 ? { requestParams: sanitizeRequestParams(meta?.request?.params) }
//                 : {}),
//               warning: headers?.warning,
//             };
//           })
//       );
//     },
//   };
// };
