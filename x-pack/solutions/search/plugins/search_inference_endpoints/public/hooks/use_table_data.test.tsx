/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { renderHook } from '@testing-library/react';
import { QueryParams } from '../components/all_inference_endpoints/types';
import { useTableData } from './use_table_data';
import { INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES } from '../components/all_inference_endpoints/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { TRAINED_MODEL_STATS_QUERY_KEY } from '../../common/constants';

const inferenceEndpoints = [
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
] as InferenceAPIConfigResponse[];

const queryParams = {
  page: 1,
  perPage: 10,
  sortField: 'endpoint',
  sortOrder: 'desc',
} as QueryParams;

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
        field: 'endpoint',
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

    const sortedEndpoints = result.current.sortedTableData.map((item) => item.endpoint);
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
          filterOptions.provider.includes(endpoint.provider) &&
          filterOptions.type.includes(endpoint.type)
      )
    ).toBeTruthy();
  });

  it('should filter data based on searchKey', () => {
    const searchKey2 = 'model-05';
    const { result } = renderHook(
      () => useTableData(inferenceEndpoints, queryParams, filterOptions, searchKey2),
      { wrapper }
    );
    const filteredData = result.current.sortedTableData;
    expect(filteredData.every((item) => item.endpoint.includes(searchKey))).toBeTruthy();
  });
});
