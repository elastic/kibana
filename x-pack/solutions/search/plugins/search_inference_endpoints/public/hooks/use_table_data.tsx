/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { type FilterOptions } from '../types';
import { useFilteredInferenceEndpoints } from './use_filtered_endpoints';

/**
 * Hook that filters inference endpoints based on provider, type, and search criteria.
 * Sorting and pagination are handled by EuiInMemoryTable.
 */
export const useTableData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  filterOptions: FilterOptions,
  searchKey: string
): InferenceInferenceEndpointInfo[] => {
  const tableData = useFilteredInferenceEndpoints(inferenceEndpoints, filterOptions, searchKey);
  return tableData;
};
