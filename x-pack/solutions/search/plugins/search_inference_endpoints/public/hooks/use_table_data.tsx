/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pagination } from '@elastic/eui';
import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { useCallback, useMemo } from 'react';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import { DEFAULT_TABLE_LIMIT } from '../components/all_inference_endpoints/constants';
import type { FilterOptions, QueryParams } from '../components/all_inference_endpoints/types';
import {
  INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
  SortFieldInferenceEndpoint,
  SortOrder,
} from '../components/all_inference_endpoints/types';
import { getModelId } from '../utils/get_model_id';

interface TableSorting {
  sort: {
    field: SortFieldInferenceEndpoint;
    direction: SortOrder;
  };
}

interface UseTableDataReturn {
  tableData: InferenceInferenceEndpointInfo[];
  sortedTableData: InferenceInferenceEndpointInfo[];
  paginatedSortedTableData: InferenceInferenceEndpointInfo[];
  pagination: Pagination;
  sorting: TableSorting;
}

export const useTableData = (
  inferenceEndpoints: InferenceAPIConfigResponse[],
  queryParams: QueryParams,
  filterOptions: FilterOptions,
  searchKey: string
): UseTableDataReturn => {
  const tableData: InferenceInferenceEndpointInfo[] = useMemo(() => {
    let filteredEndpoints = inferenceEndpoints;

    if (filterOptions.provider.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.provider.includes(ServiceProviderKeys[endpoint.service])
      );
    }

    if (filterOptions.type.length > 0) {
      filteredEndpoints = filteredEndpoints.filter((endpoint) =>
        filterOptions.type.includes(endpoint.task_type)
      );
    }

    return filteredEndpoints.filter((endpoint) => {
      const lowerSearchKey = searchKey.toLowerCase();
      const inferenceIdMatch = endpoint.inference_id.toLowerCase().includes(lowerSearchKey);
      const modelId = getModelId(endpoint);
      const modelIdMatch = modelId ? modelId.toLowerCase().includes(lowerSearchKey) : false;
      return inferenceIdMatch || modelIdMatch;
    });
  }, [inferenceEndpoints, searchKey, filterOptions]);

  const getSortValue = useCallback(
    (endpoint: InferenceInferenceEndpointInfo, field: SortFieldInferenceEndpoint): string => {
      switch (field) {
        case SortFieldInferenceEndpoint.inference_id:
          return endpoint.inference_id ?? '';
        case SortFieldInferenceEndpoint.service:
          return endpoint.service ?? '';
        case SortFieldInferenceEndpoint.task_type:
          return endpoint.task_type ?? '';
        case SortFieldInferenceEndpoint.model:
          return getModelId(endpoint) ?? '';
        default:
          return '';
      }
    },
    []
  );

  const sortedTableData: InferenceInferenceEndpointInfo[] = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const aValue = getSortValue(a, queryParams.sortField);
      const bValue = getSortValue(b, queryParams.sortField);

      if (queryParams.sortOrder === SortOrder.asc) {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }, [tableData, queryParams, getSortValue]);

  const pagination: Pagination = useMemo(
    () => ({
      pageIndex: queryParams.page - 1,
      pageSize: queryParams.perPage,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: tableData.length,
    }),
    [tableData, queryParams]
  );

  const paginatedSortedTableData: InferenceInferenceEndpointInfo[] = useMemo(() => {
    const pageSize = pagination.pageSize || DEFAULT_TABLE_LIMIT;
    const startIndex = pagination.pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedTableData.slice(startIndex, endIndex);
  }, [sortedTableData, pagination]);

  const sorting: TableSorting = useMemo(
    () => ({
      sort: {
        direction: queryParams.sortOrder,
        field: queryParams.sortField,
      },
    }),
    [queryParams.sortField, queryParams.sortOrder]
  );

  return { tableData, sortedTableData, paginatedSortedTableData, pagination, sorting };
};
