/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { type DataView } from '@kbn/data-views-plugin/public';
import { useSelectedPatterns } from './use_selected_patterns';

describe('useSelectedPatterns', () => {
  it('should return an array of patterns when the dataView returns an index pattern', () => {
    const dataView = {
      getIndexPattern: () => 'pattern1,pattern2,pattern3',
    } as unknown as DataView;

    const { result } = renderHook(() => useSelectedPatterns(dataView));

    expect(result.current).toEqual(['pattern1', 'pattern2', 'pattern3']);
  });

  it('should return an empty array when the dataView returns an empty pattern', () => {
    const dataView = {
      getIndexPattern: () => '',
    } as unknown as DataView;

    const { result } = renderHook(() => useSelectedPatterns(dataView));

    expect(result.current).toEqual([]);
  });

  it('should return an empty array when the dataView is falsy', () => {
    const { result } = renderHook(() => useSelectedPatterns(null as unknown as DataView));

    expect(result.current).toEqual([]);
  });
});
