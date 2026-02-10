/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import {
  type FilterOptions,
  type GroupedInferenceEndpointsData,
  GroupByOptions,
} from '../types';
import { getModelId } from '../utils/get_model_id';
import { useFilteredInferenceEndpoints } from './use_filtered_endpoints';

export interface UseGroupedDataResult {
  data: Record<string, GroupedInferenceEndpointsData>;
}

function GroupByReducer(groupBy: GroupByOptions) {
  switch (groupBy) {
    case GroupByOptions.Model:
      return GroupByModelReducer;
    case GroupByOptions.None:
    default:
      throw new Error('Grouping is not enabled');
  }
}

export const GroupByModelReducer = (
  acc: Record<string, GroupedInferenceEndpointsData>,
  endpoint: InferenceAPIConfigResponse,
  _index: number,
  _array: InferenceAPIConfigResponse[]
): Record<string, GroupedInferenceEndpointsData> => {
  const modelId = getModelId(endpoint) ?? 'unknown_model';
  if (modelId in acc) {
    acc[modelId].endpoints.push(endpoint);
  } else {
    acc[modelId] = {
      groupId: modelId,
      groupLabel: modelId,
      endpoints: [endpoint],
    };
  }
  return acc;
};

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

  const groupedEndpoints = useMemo(
    () =>
      filteredEndpoints.reduce<Record<string, GroupedInferenceEndpointsData>>(
        GroupByReducer(groupBy),
        {}
      ),
    [groupBy, filteredEndpoints]
  );

  return {
    data: groupedEndpoints,
  };
};
