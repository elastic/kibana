/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { renderHook } from '@testing-library/react';
import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { useTableData } from './use_table_data';
import type { FilterOptions } from '../components/all_inference_endpoints/types';

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

describe('useTableData', () => {
  it('should return all data when no filters are applied', () => {
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(3);
  });

  it('should filter data by provider', () => {
    const filterOptions: FilterOptions = {
      provider: [ServiceProviderKeys.elasticsearch],
      type: [],
    };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(2);
    expect(result.current.every((endpoint) => endpoint.service === 'elasticsearch')).toBe(true);
  });

  it('should filter data by task type', () => {
    const filterOptions: FilterOptions = { provider: [], type: ['text_embedding'] };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(1);
    expect(result.current[0].task_type).toBe('text_embedding');
  });

  it('should filter data by both provider and type', () => {
    const filterOptions: FilterOptions = {
      provider: [ServiceProviderKeys.elasticsearch],
      type: ['sparse_embedding'],
    };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(2);
    expect(
      result.current.every(
        (endpoint) =>
          endpoint.service === 'elasticsearch' && endpoint.task_type === 'sparse_embedding'
      )
    ).toBe(true);
  });

  it('should filter data based on searchKey matching inference_id', () => {
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() =>
      useTableData(inferenceEndpoints, filterOptions, 'model-05')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-openai-model-05');
  });

  it('should filter data based on searchKey matching model_id', () => {
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() =>
      useTableData(inferenceEndpoints, filterOptions, 'third-party')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-openai-model-05');
    expect(result.current[0].service_settings.model_id).toBe('third-party-model');
  });

  it('should filter data case-insensitively', () => {
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, 'ELSER'));

    expect(result.current.length).toBe(2);
    expect(result.current.every((item) => item.inference_id.includes('elser'))).toBe(true);
  });

  it('should combine provider, type, and search filters', () => {
    const filterOptions: FilterOptions = {
      provider: [ServiceProviderKeys.elasticsearch],
      type: ['sparse_embedding'],
    };
    const { result } = renderHook(() =>
      useTableData(inferenceEndpoints, filterOptions, 'model-01')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-elser-model-01');
  });

  it('should return empty array when no endpoints match filters', () => {
    const filterOptions: FilterOptions = { provider: [ServiceProviderKeys.cohere], type: [] };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(0);
  });

  it('should return empty array when inferenceEndpoints is empty', () => {
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() => useTableData([], filterOptions, ''));

    expect(result.current.length).toBe(0);
  });

  it('should filter by multiple providers', () => {
    const filterOptions: FilterOptions = {
      provider: [ServiceProviderKeys.elasticsearch, ServiceProviderKeys.openai],
      type: [],
    };
    const { result } = renderHook(() => useTableData(inferenceEndpoints, filterOptions, ''));

    expect(result.current.length).toBe(3);
  });

  it('should handle endpoints with no model_id in service_settings', () => {
    const endpointsWithNoModelId: InferenceAPIConfigResponse[] = [
      {
        inference_id: 'endpoint-no-model',
        task_type: 'sparse_embedding',
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
        },
        task_settings: {},
      },
    ];
    const filterOptions: FilterOptions = { provider: [], type: [] };

    // Should still find by inference_id
    const { result } = renderHook(() =>
      useTableData(endpointsWithNoModelId, filterOptions, 'endpoint-no-model')
    );
    expect(result.current.length).toBe(1);

    // Should not match when searching for non-existent model_id
    const { result: result2 } = renderHook(() =>
      useTableData(endpointsWithNoModelId, filterOptions, 'some-model-id')
    );
    expect(result2.current.length).toBe(0);
  });

  it('should search by service_settings.model field (alternative to model_id)', () => {
    const endpointsWithModelField: InferenceAPIConfigResponse[] = [
      {
        inference_id: 'bedrock-endpoint',
        task_type: 'text_embedding',
        service: 'amazonbedrock',
        service_settings: {
          model: 'amazon.titan-embed-text-v1',
        },
        task_settings: {},
      },
    ];
    const filterOptions: FilterOptions = { provider: [], type: [] };
    const { result } = renderHook(() =>
      useTableData(endpointsWithModelField, filterOptions, 'titan-embed')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('bedrock-endpoint');
  });
});
