/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { InferenceEndpoints } from '../__mocks__/inference_endpoints';

import { useGroupedData } from './use_grouped_data';
import { GroupByOptions, type QueryParams, SortFieldInferenceEndpoint, SortOrder } from '../types';

const queryParams: QueryParams = {
  page: 1,
  perPage: 10,
  sortField: SortFieldInferenceEndpoint.inference_id,
  sortOrder: SortOrder.desc,
  groupBy: GroupByOptions.Model,
};

describe('useGroupedData', () => {
  it('should throw an error when groupBy is set to None', () => {
    expect(() =>
      renderHook(() =>
        useGroupedData(
          InferenceEndpoints,
          { ...queryParams, groupBy: GroupByOptions.None },
          { provider: [], type: [] },
          ''
        )
      )
    ).toThrowError('Grouping is not enabled');
  });

  it('should group endpoints by model_id', () => {
    const { result } = renderHook(() =>
      useGroupedData(InferenceEndpoints, queryParams, { provider: [], type: [] }, '')
    );

    expect(result.current).toMatchSnapshot();
  });

  it('should return empty object when no endpoints provided', () => {
    const { result } = renderHook(() =>
      useGroupedData([], queryParams, { provider: [], type: [] }, '')
    );

    expect(result.current.data).toEqual({});
  });
});
