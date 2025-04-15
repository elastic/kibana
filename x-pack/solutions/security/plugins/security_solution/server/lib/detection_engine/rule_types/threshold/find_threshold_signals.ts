/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isEmpty } from 'lodash';

import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ESBoolQuery } from '../../../../../common/typed_json';

import type {
  ThresholdNormalized,
  TimestampOverride,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { singleSearchAfter } from '../utils/single_search_after';
import { buildEventsSearchQuery } from '../utils/build_events_query';
import {
  buildThresholdMultiBucketAggregation,
  buildThresholdSingleBucketAggregation,
} from './build_threshold_aggregation';
import type { ThresholdCompositeBucket } from './types';
import { shouldFilterByCardinality } from './utils';
import type { IRuleExecutionLogForExecutors } from '../../rule_monitoring';
import { getMaxSignalsWarning, stringifyAfterKey } from '../utils/utils';
import type { RulePreviewLoggedRequest } from '../../../../../common/api/detection_engine/rule_preview/rule_preview.gen';
import * as i18n from '../translations';

interface FindThresholdSignalsParams {
  from: string;
  to: string;
  maxSignals: number;
  inputIndexPattern: string[];
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  filter: ESBoolQuery;
  threshold: ThresholdNormalized;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  aggregatableTimestampField: string;
  isLoggedRequestsEnabled?: boolean;
}

const hasThresholdFields = (threshold: ThresholdNormalized) => !!threshold.field.length;

interface SearchAfterResults {
  searchDurations: string[];
  searchErrors: string[];
}

export const findThresholdSignals = async ({
  from,
  to,
  maxSignals,
  inputIndexPattern,
  services,
  ruleExecutionLogger,
  filter,
  threshold,
  runtimeMappings,
  primaryTimestamp,
  secondaryTimestamp,
  aggregatableTimestampField,
  isLoggedRequestsEnabled,
}: FindThresholdSignalsParams): Promise<{
  buckets: ThresholdCompositeBucket[];
  searchDurations: string[];
  searchErrors: string[];
  warnings: string[];
  loggedRequests?: RulePreviewLoggedRequest[];
}> => {
  // Leaf aggregations used below
  const buckets: ThresholdCompositeBucket[] = [];
  const searchAfterResults: SearchAfterResults = {
    searchDurations: [],
    searchErrors: [],
  };
  const warnings: string[] = [];
  const loggedRequests: RulePreviewLoggedRequest[] = [];

  const includeCardinalityFilter = shouldFilterByCardinality(threshold);

  if (hasThresholdFields(threshold)) {
    let sortKeys: Record<string, string | number | null> | undefined;
    do {
      const searchRequest = buildEventsSearchQuery({
        aggregations: buildThresholdMultiBucketAggregation({
          threshold,
          aggregatableTimestampField,
          sortKeys,
        }),
        index: inputIndexPattern,
        from,
        to,
        runtimeMappings,
        filter,
        size: 0,
        sortOrder: 'desc',
        searchAfterSortIds: undefined,
        primaryTimestamp,
        secondaryTimestamp,
      });

      const {
        searchResult,
        searchDuration,
        searchErrors,
        loggedRequests: thresholdLoggedRequests,
      } = await singleSearchAfter({
        searchRequest,
        services,
        ruleExecutionLogger,
        loggedRequestsConfig: isLoggedRequestsEnabled
          ? {
              type: 'findThresholdBuckets',
              description: i18n.FIND_THRESHOLD_BUCKETS_DESCRIPTION(stringifyAfterKey(sortKeys)),
              skipRequestQuery: loggedRequests.length > 2,
            }
          : undefined,
      });

      searchAfterResults.searchDurations.push(searchDuration);
      loggedRequests.push(...(thresholdLoggedRequests ?? []));

      if (!isEmpty(searchErrors)) {
        searchAfterResults.searchErrors.push(...searchErrors);
        sortKeys = undefined; // this will eject us out of the loop
        // if a search failure occurs on a secondary iteration,
        // we will return early.
      } else if (searchResult.aggregations != null) {
        const thresholdTerms = searchResult.aggregations.thresholdTerms;
        sortKeys = thresholdTerms.after_key;
        buckets.push(...thresholdTerms.buckets);
      } else {
        throw new Error('Aggregations were missing on threshold rule search result');
      }
    } while (sortKeys && buckets.length <= maxSignals);
  } else {
    const searchRequest = buildEventsSearchQuery({
      aggregations: buildThresholdSingleBucketAggregation({
        threshold,
        aggregatableTimestampField,
      }),
      index: inputIndexPattern,
      from,
      to,
      runtimeMappings,
      filter,
      size: 0,
      sortOrder: 'desc',
      searchAfterSortIds: undefined,
      primaryTimestamp,
      secondaryTimestamp,
    });
    const {
      searchResult,
      searchDuration,
      searchErrors,
      loggedRequests: thresholdLoggedRequests,
    } = await singleSearchAfter({
      searchRequest,
      services,
      ruleExecutionLogger,
      loggedRequestsConfig: isLoggedRequestsEnabled
        ? {
            type: 'findThresholdBuckets',
            description: i18n.FIND_THRESHOLD_BUCKETS_DESCRIPTION(),
          }
        : undefined,
    });

    searchAfterResults.searchDurations.push(searchDuration);
    searchAfterResults.searchErrors.push(...searchErrors);
    loggedRequests.push(...(thresholdLoggedRequests ?? []));

    if (isEmpty(searchErrors)) {
      searchAfterResults.searchErrors.push(...searchErrors);
    } else if (searchResult.aggregations != null) {
      const docCount = searchResult.hits.total.value;
      if (
        docCount >= threshold.value &&
        (!includeCardinalityFilter ||
          (searchResult?.aggregations?.cardinality_count?.value ?? 0) >=
            threshold.cardinality[0].value)
      ) {
        buckets.push({
          doc_count: docCount,
          key: {},
          max_timestamp: searchResult.aggregations.max_timestamp,
          min_timestamp: searchResult.aggregations.min_timestamp,
          cardinality_count: searchResult.aggregations.cardinality_count,
        });
      }
    } else {
      throw new Error('Aggregations were missing on threshold rule search result');
    }
  }

  if (buckets.length > maxSignals) {
    warnings.push(getMaxSignalsWarning());
  }

  return {
    buckets: buckets.slice(0, maxSignals),
    ...searchAfterResults,
    warnings,
    ...(isLoggedRequestsEnabled ? { loggedRequests } : {}),
  };
};
