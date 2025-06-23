/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import type {
  RuleFilterArray,
  TimestampOverride,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { buildTimeRangeFilter } from '../utils/build_events_query';
import { getQueryFilter } from '../utils/get_query_filter';

export interface BuildEqlSearchRequestParams {
  query: string;
  from: string;
  to: string;
  size: number;
  filters: RuleFilterArray | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  exceptionFilter: Filter | undefined;
  excludedDocumentIds: string[];
  ruleExecutionTimeout: string | undefined;
}

export const buildEsqlSearchRequest = ({
  query,
  from,
  to,
  filters,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  size,
  excludedDocumentIds,
  ruleExecutionTimeout,
}: BuildEqlSearchRequestParams) => {
  const esFilter = getQueryFilter({
    query: '',
    language: 'esql',
    filters: filters || [],
    index: undefined,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });

  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter, esFilter];

  return {
    query: `${query} | limit ${size}`,
    filter: {
      bool: {
        filter: requestFilter,
        ...(excludedDocumentIds.length > 0
          ? {
              must_not: { ids: { values: excludedDocumentIds } },
            }
          : {}),
      },
    },
    wait_for_completion_timeout: '4m', // hard limit request timeout is 5m set by ES proxy and alerting framework. So, we should be fine to wait 4m for async query completion. If rule execution is shorter than 4m and query was not completed, it will be aborted.
    ...(ruleExecutionTimeout ? { keep_alive: ruleExecutionTimeout } : {}),
  };
};
