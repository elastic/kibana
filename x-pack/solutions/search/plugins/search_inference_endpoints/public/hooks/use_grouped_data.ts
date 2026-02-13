/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { i18n } from '@kbn/i18n';

import { type FilterOptions, type GroupedInferenceEndpointsData, GroupByOptions } from '../types';
import { getModelId } from '../utils/get_model_id';
import { useFilteredInferenceEndpoints } from './use_filtered_endpoints';
import { KNOWN_MODEL_GROUPS } from '../utils/known_models';

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

export const UNKNOWN_MODEL_ID_FALLBACK = 'unknown_model';
const UNKNOWN_MODEL_LABEL_FALLBACK = i18n.translate(
  'xpack.searchInferenceEndpoints.groupedEndpoints.unknownModelLabel',
  {
    defaultMessage: 'Unknown Model',
  }
);

export const GroupByModelReducer = (
  acc: Record<string, GroupedInferenceEndpointsData>,
  endpoint: InferenceAPIConfigResponse
): Record<string, GroupedInferenceEndpointsData> => {
  const modelId = getModelId(endpoint) ?? UNKNOWN_MODEL_ID_FALLBACK;

  // Test model against predefined known model groups. If it matches, group by the known group.
  // otherwise group by the model ID. In the future endpoints should have metadata that allows for more robust grouping,
  // but this is a start to make the UI more user friendly.
  const knownGroup = KNOWN_MODEL_GROUPS.find((group) => group.groupTest(modelId));
  if (knownGroup) {
    if (knownGroup.groupId in acc) {
      acc[knownGroup.groupId].endpoints.push(endpoint);
    } else {
      acc[knownGroup.groupId] = {
        groupId: knownGroup.groupId,
        groupLabel: knownGroup.groupLabel,
        endpoints: [endpoint],
      };
    }
  } else {
    if (modelId in acc) {
      acc[modelId].endpoints.push(endpoint);
    } else {
      acc[modelId] = {
        groupId: modelId,
        groupLabel: modelId === UNKNOWN_MODEL_ID_FALLBACK ? UNKNOWN_MODEL_LABEL_FALLBACK : modelId,
        endpoints: [endpoint],
      };
    }
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
