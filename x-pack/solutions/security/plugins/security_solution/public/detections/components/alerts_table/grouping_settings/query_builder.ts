/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoolQuery } from '@kbn/es-query';
import { getGroupingQuery, isNoneGroup, type NamedAggregation } from '@kbn/grouping';
import type { RunTimeMappings } from '../../../../sourcerer/store/model';

export interface AlertsGroupingQueryParams {
  additionalFilters: Array<{
    bool: BoolQuery;
  }>;
  from: string;
  /**
   * Function that returns the group aggregations by field.
   * This is then used to render values in the EuiAccordion `extraAction` section.
   */
  groupStatsAggregations: (field: string) => NamedAggregation[];
  pageIndex: number;
  pageSize: number;
  runtimeMappings: RunTimeMappings;
  selectedGroup: string;
  uniqueValue: string;
  to: string;
}

export const getAlertsGroupingQuery = ({
  additionalFilters,
  from,
  groupStatsAggregations,
  pageIndex,
  pageSize,
  runtimeMappings,
  selectedGroup,
  uniqueValue,
  to,
}: AlertsGroupingQueryParams) =>
  getGroupingQuery({
    additionalFilters,
    timeRange: {
      from,
      to,
    },
    groupByField: selectedGroup,
    statsAggregations: !isNoneGroup([selectedGroup]) ? groupStatsAggregations(selectedGroup) : [],
    pageNumber: pageIndex * pageSize,
    runtimeMappings,
    uniqueValue,
    size: pageSize,
    sort: [{ unitsCount: { order: 'desc' } }],
  });
