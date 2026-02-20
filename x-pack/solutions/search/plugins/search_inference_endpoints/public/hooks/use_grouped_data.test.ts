/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { InferenceEndpoints } from '../__mocks__/inference_endpoints';

import { UNKNOWN_MODEL_ID_FALLBACK } from '../utils/group_by';
import { useGroupedData } from './use_grouped_data';
import { GroupByOptions } from '../types';

describe('useGroupedData', () => {
  it('should throw an error when groupBy is set to None', () => {
    expect(() =>
      renderHook(() =>
        useGroupedData(InferenceEndpoints, GroupByOptions.None, { provider: [], type: [] }, '')
      )
    ).toThrowError('Grouping is not enabled');
  });

  it('should group endpoints by model_id', () => {
    const { result } = renderHook(() =>
      useGroupedData(InferenceEndpoints, GroupByOptions.Model, { provider: [], type: [] }, '')
    );

    expect(result.current).toMatchSnapshot();
  });

  it('should return empty object when no endpoints provided', () => {
    const { result } = renderHook(() =>
      useGroupedData([], GroupByOptions.Model, { provider: [], type: [] }, '')
    );

    expect(result.current).toEqual([]);
  });

  it('should sort elastic endpoints first when grouping by model', () => {
    const { result } = renderHook(() =>
      useGroupedData(InferenceEndpoints, GroupByOptions.Model, { provider: [], type: [] }, '')
    );

    expect(result.current[0].groupId).toBe('elastic');
  });

  it('should group endpoints with unknown model_id under unknown model group', () => {
    const { result } = renderHook(() =>
      useGroupedData(InferenceEndpoints, GroupByOptions.Model, { provider: [], type: [] }, '')
    );

    const unknownModelGroup = result.current.find(
      (group) => group.groupId === UNKNOWN_MODEL_ID_FALLBACK
    );
    expect(unknownModelGroup).toBeDefined();
    expect(unknownModelGroup!.groupLabel).toBe('Unknown Model');
    expect(unknownModelGroup!.endpoints).toHaveLength(2);
  });
});
