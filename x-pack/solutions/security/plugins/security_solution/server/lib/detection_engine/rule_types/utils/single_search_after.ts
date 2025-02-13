/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { performance } from 'perf_hooks';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type {
  SignalSearchResponse,
  SignalSource,
  OverrideBodyQuery,
  LoggedRequestsConfig,
} from '../types';
import { buildEventsSearchQuery } from './build_events_query';
import { createErrorsFromShard, makeFloatString } from './utils';
import type { TimestampOverride } from '../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import { logSearchRequest } from './logged_requests';

export interface SingleSearchAfterParams {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  searchAfterSortIds: estypes.SortResults | undefined;
  index: string[];
  from: string;
  to: string;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  pageSize: number;
  sortOrder?: estypes.SortOrder;
  filter: estypes.QueryDslQueryContainer;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  trackTotalHits?: boolean;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  additionalFilters?: estypes.QueryDslQueryContainer[];
  overrideBody?: OverrideBodyQuery;
  loggedRequestsConfig?: LoggedRequestsConfig;
}

// utilize search_after for paging results into bulk.
export const singleSearchAfter = async <
  TAggregations = Record<estypes.AggregateName, estypes.AggregationsAggregate>
>({
  aggregations,
  searchAfterSortIds,
  index,
  runtimeMappings,
  from,
  to,
  services,
  filter,
  ruleExecutionLogger,
  pageSize,
  sortOrder,
  primaryTimestamp,
  secondaryTimestamp,
  trackTotalHits,
  additionalFilters,
  overrideBody,
  loggedRequestsConfig,
}: SingleSearchAfterParams): Promise<{
  searchResult: SignalSearchResponse<TAggregations>;
  searchDuration: string;
  searchErrors: string[];
  loggedRequests?: RulePreviewLoggedRequest[];
}> => {
  return withSecuritySpan('singleSearchAfter', async () => {
    const loggedRequests: RulePreviewLoggedRequest[] = [];

    try {
      const searchAfterQuery = buildEventsSearchQuery({
        aggregations,
        index,
        from,
        to,
        runtimeMappings,
        filter,
        size: pageSize,
        sortOrder,
        searchAfterSortIds,
        primaryTimestamp,
        secondaryTimestamp,
        trackTotalHits,
        additionalFilters,
        /**
         * overrideBody allows the search after to ignore the _source property of the result,
         * thus reducing the size of the response and increasing the performance of the query.
         */
        overrideBody,
      });

      const start = performance.now();
      const { body: nextSearchAfterResult } =
        await services.scopedClusterClient.asCurrentUser.search<SignalSource, TAggregations>(
          searchAfterQuery,
          { meta: true }
        );

      const end = performance.now();

      const searchErrors = createErrorsFromShard({
        errors: nextSearchAfterResult._shards.failures ?? [],
      });

      if (loggedRequestsConfig) {
        loggedRequests.push({
          request: loggedRequestsConfig.skipRequestQuery
            ? undefined
            : logSearchRequest(searchAfterQuery),
          description: loggedRequestsConfig.description,
          request_type: loggedRequestsConfig.type,
          duration: Math.round(end - start),
        });
      }

      return {
        searchResult: nextSearchAfterResult,
        searchDuration: makeFloatString(end - start),
        searchErrors,
        loggedRequests,
      };
    } catch (exc) {
      ruleExecutionLogger.error(`Searching events operation failed: ${exc}`);
      if (
        exc.message.includes(`No mapping found for [${primaryTimestamp}] in order to sort on`) ||
        (secondaryTimestamp &&
          exc.message.includes(`No mapping found for [${secondaryTimestamp}] in order to sort on`))
      ) {
        const searchRes: SignalSearchResponse<TAggregations> = {
          took: 0,
          timed_out: false,
          _shards: {
            total: 1,
            successful: 1,
            failed: 0,
            skipped: 0,
          },
          hits: {
            total: 0,
            max_score: 0,
            hits: [],
          },
        };
        return {
          searchResult: searchRes,
          searchDuration: '-1.0',
          searchErrors: exc.message,
          loggedRequests,
        };
      }

      throw exc;
    }
  });
};
