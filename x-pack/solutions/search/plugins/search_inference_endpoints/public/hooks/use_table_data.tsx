/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useMemo } from 'react';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { FilterOptions } from '../components/all_inference_endpoints/types';
import { getModelId } from '../utils/get_model_id';

/**
 * Hook that filters inference endpoints based on provider, type, and search criteria.
 * Sorting and pagination are handled by EuiInMemoryTable.
 */
export const useTableData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  filterOptions: FilterOptions,
  searchKey: string
): InferenceInferenceEndpointInfo[] => {
  return useMemo(() => {
    let filteredEndpoints = inferenceEndpoints;

    // Filter by provider
    if (filterOptions.provider.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.provider.includes(ServiceProviderKeys[endpoint.service])
      );
    }

    // Filter by task type
    if (filterOptions.type.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.type.includes(endpoint.task_type)
      );
    }

    // Filter by search key (matches inference_id or model_id)
    if (searchKey) {
      const lowerSearchKey = searchKey.toLowerCase();
      filteredEndpoints = filteredEndpoints.filter((endpoint) => {
        const inferenceIdMatch = endpoint.inference_id.toLowerCase().includes(lowerSearchKey);
        const modelId = getModelId(endpoint);
        const modelIdMatch = modelId ? modelId.toLowerCase().includes(lowerSearchKey) : false;
        return inferenceIdMatch || modelIdMatch;
      });
    }

    return filteredEndpoints;
  }, [inferenceEndpoints, searchKey, filterOptions]);
};
