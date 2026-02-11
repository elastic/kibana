/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { renderHook } from '@testing-library/react';
import type { QueryParams } from '../components/all_inference_endpoints/types';
import { SortFieldInferenceEndpoint, SortOrder } from '../components/all_inference_endpoints/types';
import { useTableData } from './use_table_data';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../components/all_inference_endpoints/types';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import { TRAINED_MODEL_STATS_QUERY_KEY } from '../../common/constants';

const inferenceEndpoints: InferenceAPIConfigResponse[] = [
  {
    inference_id: 'my-elser-model-04',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-elser-model-01',
    task_type: 'sparse_embedding',
    service: 'elasticsearch',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
      model_id: '.elser_model_2',
    },
    task_settings: {},
  },
  {
    inference_id: 'my-openai-model-05',
    task_type: 'text_embedding',
    service: 'openai',
    service_settings: {
      url: 'https://somewhere.com',
      model_id: 'third-party-model',
    },
    task_settings: {},
  },
];

const queryParams: QueryParams = {
  page: 1,
  perPage: 10,
  sortField: SortFieldInferenceEndpoint.inference_id,
  sortOrder: SortOrder.desc,
};

const filterOptions = {
  provider: ['elasticsearch', 'openai'],
  type: ['sparse_embedding', 'text_embedding'],
} as any;

const searchKey = 'my';

describe('useTableData', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    queryClient.setQueryData([TRAINED_MODEL_STATS_QUERY_KEY], {
      trained_model_stats: [
        {
          model_id: '.elser_model_2',
          deployment_stats: { deployment_id: 'my-elser-model-01', state: 'started' },
        },
      ],
    });
  });
  it('should return correct pagination', () => {
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey),
      { wrapper }
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: 3,
    });
  });

  it('should return correct sorting', () => {
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey),
      { wrapper }
    );

    expect(result.current.sorting).toEqual({
      sort: {
        direction: 'desc',
        field: 'inference_id',
      },
    });
  });

  it('should return correctly sorted data', () => {
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey),
      { wrapper }
    );

    const expectedSortedData = [...inferenceEndpoints].sort((a, b) =>
      b.inference_id.localeCompare(a.inference_id)
    );

    const sortedEndpoints = result.current.sortedTableData.map((item) => item.inference_id);
    const expectedModelIds = expectedSortedData.map((item) => item.inference_id);

    expect(sortedEndpoints).toEqual(expectedModelIds);
  });

  it('should filter data based on provider and type from filterOptions', () => {
    const filterOptions2 = {
      provider: ['elasticsearch'],
      type: ['text_embedding'],
    } as any;
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions2, searchKey),
      { wrapper }
    );

    const filteredData = result.current.sortedTableData;
    expect(
      filteredData.every(
        (endpoint) =>
          filterOptions.provider.includes(endpoint.service) &&
          filterOptions.type.includes(endpoint.task_type)
      )
    ).toBeTruthy();
  });

  it('should filter data based on searchKey matching inference_id', () => {
    const searchKey2 = 'model-05';
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey2),
      { wrapper }
    );
    const filteredData = result.current.sortedTableData;
    expect(filteredData.length).toBe(1);
    expect(filteredData[0].inference_id).toBe('my-openai-model-05');
  });

  it('should filter data based on searchKey matching model_id', () => {
    // Search for 'third-party' which only exists in model_id, not in inference_id
    const searchKey2 = 'third-party';
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey2),
      { wrapper }
    );
    const filteredData = result.current.sortedTableData;
    expect(filteredData.length).toBe(1);
    // Verify the correct endpoint was found by checking both inference_id and model_id
    expect(filteredData[0].inference_id).toBe('my-openai-model-05');
    expect(filteredData[0].service_settings.model_id).toBe('third-party-model');
  });

  it('should filter data case-insensitively', () => {
    const searchKey2 = 'ELSER';
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey2),
      { wrapper }
    );
    const filteredData = result.current.sortedTableData;
    expect(filteredData.length).toBe(2);
    expect(filteredData.every((item) => item.inference_id.includes('elser'))).toBeTruthy();
  });

  it('should set pagination total to filtered count', () => {
    const filteredSearchKey = 'third-party';
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, filteredSearchKey),
      { wrapper }
    );

    expect(result.current.pagination).toEqual({
      pageIndex: 0,
      pageSize: 10,
      pageSizeOptions: INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES,
      totalItemCount: 1,
    });
  });
});
