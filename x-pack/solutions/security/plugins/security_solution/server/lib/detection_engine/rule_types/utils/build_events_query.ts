/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty } from 'lodash';
import type { OverrideBodyQuery } from '../types';
import type { TimestampOverride } from '../../../../../common/api/detection_engine/model/rule_schema';

interface BuildEventsSearchQuery {
  aggregations?: Record<string, estypes.AggregationsAggregationContainer>;
  index: string[];
  from: string;
  to: string;
  filter: estypes.QueryDslQueryContainer;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  size: number;
  sortOrder?: estypes.SortOrder;
  searchAfterSortIds: estypes.SortResults | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  trackTotalHits?: boolean;
  additionalFilters?: estypes.QueryDslQueryContainer[];
  overrideBody?: OverrideBodyQuery;
}

export const buildTimeRangeFilter = ({
  to,
  from,
  primaryTimestamp,
  secondaryTimestamp,
}: {
  to: string;
  from: string;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
}): estypes.QueryDslQueryContainer => {
  // The primaryTimestamp is always provided and will contain either the timestamp override field or `@timestamp` otherwise.
  // The secondaryTimestamp is `undefined` if
  //   1. timestamp override field is not specified
  //   2. timestamp override field is set and timestamp fallback is disabled
  //   3. timestamp override field is set to `@timestamp`
  // or `@timestamp` otherwise.
  //
  // If the secondaryTimestamp is provided, documents must either populate primaryTimestamp with a timestamp in the range
  // or must NOT populate the primaryTimestamp field at all and secondaryTimestamp must fall in the range.
  // If secondaryTimestamp is not provided, we simply use primaryTimestamp
  return secondaryTimestamp != null
    ? {
        bool: {
          minimum_should_match: 1,
          should: [
            {
              range: {
                [primaryTimestamp]: {
                  lte: to,
                  gte: from,
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                filter: [
                  {
                    range: {
                      [secondaryTimestamp]: {
                        lte: to,
                        gte: from,
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                  {
                    bool: {
                      must_not: {
                        exists: {
                          field: primaryTimestamp,
                        },
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    : {
        range: {
          [primaryTimestamp]: {
            lte: to,
            gte: from,
            format: 'strict_date_optional_time',
          },
        },
      };
};

export const buildEventsSearchQuery = ({
  aggregations,
  index,
  from,
  to,
  filter,
  size,
  runtimeMappings,
  searchAfterSortIds,
  sortOrder,
  primaryTimestamp,
  secondaryTimestamp,
  trackTotalHits,
  additionalFilters,
  overrideBody,
}: BuildEventsSearchQuery): estypes.SearchRequest => {
  const timestamps = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });

  const filterWithTime: estypes.QueryDslQueryContainer[] = [
    filter,
    rangeFilter,
    ...(additionalFilters ? additionalFilters : []),
  ];

  const sort: estypes.Sort = [];
  sort.push({
    [primaryTimestamp]: {
      order: sortOrder ?? 'asc',
      unmapped_type: 'date',
    },
  });
  if (secondaryTimestamp) {
    sort.push({
      [secondaryTimestamp]: {
        order: sortOrder ?? 'asc',
        unmapped_type: 'date',
      },
    });
  }

  const searchQuery: estypes.SearchRequest = {
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    body: {
      track_total_hits: trackTotalHits,
      size,
      query: {
        bool: {
          filter: filterWithTime,
        },
      },
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        ...docFields,
      ],
      ...(aggregations ? { aggregations } : {}),
      runtime_mappings: runtimeMappings,
      sort,
      ...overrideBody,
    },
  };

  if (searchAfterSortIds != null && !isEmpty(searchAfterSortIds)) {
    return {
      ...searchQuery,
      body: {
        ...searchQuery.body,
        search_after: searchAfterSortIds,
      },
    };
  }
  return searchQuery;
};
