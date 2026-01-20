/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import type { GroupingAggregation, RawBucket } from '@kbn/grouping';
import type { AlertsGroupingAggregation } from './types';

/**
 * Expected column names in ES|QL query results for grouping
 * Consumers must include these columns in their ES|QL queries
 */
export const ESQL_GROUPING_KEY_COLUMN = 'grouping_key';
export const ESQL_GROUPING_COUNT_COLUMN = 'count';

/**
 * Transforms ES|QL query results to GroupingAggregation format
 *
 * Expected ES|QL query structure:
 * - Must include columns named: `grouping_key` (the grouping field) and `count` (the count)
 * - Example: `FROM index | STATS count = COUNT(*) BY field_name | RENAME field_name AS grouping_key`
 *
 * @param esqlResponse - The ES|QL search response
 * @returns Transformed GroupingAggregation structure
 */
export const transformEsqlToGroupingAggregation = (
  esqlResponse: ESQLSearchResponse
): GroupingAggregation<AlertsGroupingAggregation> => {
  const { columns, values } = esqlResponse;

  if (!columns || !values || columns.length < 2) {
    return {
      groupByFields: { buckets: [] },
      groupsCount: { value: 0 },
      unitsCount: { value: 0 },
    };
  }

  // Find column indices by name
  const groupingKeyColumnIndex = columns.findIndex((col) => col.name === ESQL_GROUPING_KEY_COLUMN);
  const countColumnIndex = columns.findIndex((col) => col.name === ESQL_GROUPING_COUNT_COLUMN);

  // Validate that we have the expected columns
  if (groupingKeyColumnIndex === -1 || countColumnIndex === -1) {
    return {
      groupByFields: { buckets: [] },
      groupsCount: { value: 0 },
      unitsCount: { value: 0 },
    };
  }

  // Transform ES|QL rows to aggregation buckets
  const buckets: RawBucket<AlertsGroupingAggregation>[] = [];
  let totalCount = 0;

  for (const row of values) {
    if (Array.isArray(row) && row.length > Math.max(groupingKeyColumnIndex, countColumnIndex)) {
      const groupKey = row[groupingKeyColumnIndex];
      const count = row[countColumnIndex];

      // Handle null/undefined grouping keys
      const key = groupKey == null ? null : String(groupKey);
      const docCount = typeof count === 'number' ? count : 0;

      totalCount += docCount;

      buckets.push({
        key: key ?? '',
        doc_count: docCount,
      } as RawBucket<AlertsGroupingAggregation>);
    }
  }

  return {
    groupByFields: {
      buckets,
    },
    groupsCount: {
      value: buckets.length,
    },
    unitsCount: {
      value: totalCount,
    },
  };
};
