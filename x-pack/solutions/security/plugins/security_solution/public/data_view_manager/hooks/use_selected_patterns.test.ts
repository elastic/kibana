/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSelectedPatterns } from './use_selected_patterns';
import { useDataView } from './use_data_view';
import type { DataViewManagerScopeName } from '../constants';

// Mock the useDataView hook
jest.mock('./use_data_view');

describe('useSelectedPatterns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an array of patterns when dataView returns an index pattern', () => {
    // Setup
    (useDataView as jest.Mock).mockReturnValue({
      dataView: {
        getIndexPattern: () => 'pattern1,pattern2,pattern3',
      },
    });

    // Execute
    const { result } = renderHook(() =>
      useSelectedPatterns('mockScope' as DataViewManagerScopeName)
    );

    // Verify
    expect(result.current).toEqual(['pattern1', 'pattern2', 'pattern3']);
    expect(useDataView).toHaveBeenCalledWith('mockScope');
  });

  it('should return an empty array when dataView returns an empty pattern', () => {
    // Setup
    (useDataView as jest.Mock).mockReturnValue({
      dataView: {
        getIndexPattern: () => '',
      },
    });

    // Execute
    const { result } = renderHook(() =>
      useSelectedPatterns('mockScope' as DataViewManagerScopeName)
    );

    // Verify
    expect(result.current).toEqual([]);
  });

  it('should return an empty array when dataView is falsy', () => {
    // Setup
    (useDataView as jest.Mock).mockReturnValue({
      dataView: null,
    });

    // Execute
    const { result } = renderHook(() =>
      useSelectedPatterns('mockScope' as DataViewManagerScopeName)
    );

    // Verify
    expect(result.current).toEqual([]);
  });
});
