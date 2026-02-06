/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { renderHook } from '@testing-library/react';
import { useFilteredTableData } from './use_filtered_table_data';

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

const defaultFilterOptions = {
  provider: [],
  type: [],
} as any;

describe('useFilteredTableData', () => {
  it('should return all endpoints when no filters are applied', () => {
    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, defaultFilterOptions, '')
    );

    expect(result.current.length).toBe(3);
  });

  it('should filter data based on provider', () => {
    const filterOptions = {
      provider: ['openai'],
      type: [],
    } as any;

    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, filterOptions, '')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-openai-model-05');
  });

  it('should filter data based on type', () => {
    const filterOptions = {
      provider: [],
      type: ['text_embedding'],
    } as any;

    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, filterOptions, '')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].task_type).toBe('text_embedding');
  });

  it('should filter data based on both provider and type', () => {
    const filterOptions = {
      provider: ['elasticsearch'],
      type: ['sparse_embedding'],
    } as any;

    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, filterOptions, '')
    );

    expect(result.current.length).toBe(2);
    expect(result.current.every((e) => e.service === 'elasticsearch')).toBe(true);
    expect(result.current.every((e) => e.task_type === 'sparse_embedding')).toBe(true);
  });

  it('should filter data based on searchKey matching inference_id', () => {
    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, defaultFilterOptions, 'model-05')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-openai-model-05');
  });

  it('should filter data based on searchKey matching model_id', () => {
    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, defaultFilterOptions, 'third-party')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-openai-model-05');
    expect(result.current[0].service_settings.model_id).toBe('third-party-model');
  });

  it('should filter data case-insensitively', () => {
    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, defaultFilterOptions, 'ELSER')
    );

    expect(result.current.length).toBe(2);
    expect(result.current.every((item) => item.inference_id.includes('elser'))).toBe(true);
  });

  it('should combine filters and search', () => {
    const filterOptions = {
      provider: ['elasticsearch'],
      type: [],
    } as any;

    const { result } = renderHook(() =>
      useFilteredTableData(inferenceEndpoints, filterOptions, 'model-04')
    );

    expect(result.current.length).toBe(1);
    expect(result.current[0].inference_id).toBe('my-elser-model-04');
  });
});
