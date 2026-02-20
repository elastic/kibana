/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { type FilterOptions, type GroupedInferenceEndpointsData, GroupByOptions } from '../types';

import { useFilteredInferenceEndpoints } from './use_filtered_endpoints';
import { GroupByReducer, GroupBySort } from '../utils/group_by';

export type UseGroupedDataResult = GroupedInferenceEndpointsData[];

export const useGroupedData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  groupBy: GroupByOptions,
  filterOptions: FilterOptions,
  searchKey: string
): UseGroupedDataResult => {
  if (groupBy === GroupByOptions.None) {
    throw new Error('Grouping is not enabled');
  }

  const filteredEndpoints = useFilteredInferenceEndpoints(
    inferenceEndpoints,
    filterOptions,
    searchKey
  );

  const groupedEndpoints = useMemo(() => {
    const groupedEndpointsMap = filteredEndpoints.reduce<
      Record<string, GroupedInferenceEndpointsData>
    >(GroupByReducer(groupBy), {});
    const groupedEndpointList = Object.values(groupedEndpointsMap);
    groupedEndpointList.sort(GroupBySort(groupBy));
    return groupedEndpointList;
  }, [groupBy, filteredEndpoints]);

  return groupedEndpoints;
};
