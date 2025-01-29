/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useQueryIndices } from './use_query_indices';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      services: {
        http: {},
      },
    },
  }),
}));

jest.mock('./use_query_indices', () => ({
  useQueryIndices: jest.fn(),
}));

describe('useQueryIndices Hook', () => {
  afterEach(jest.clearAllMocks);

  it('successfully loads indices', async () => {
    const mockUseQueryIndices = (data: string[]) => {
      (useQueryIndices as jest.Mock).mockReturnValue({ indices: data, isLoading: false });
    };
    const mockIndices = ['index-1', 'index-2'];
    mockUseQueryIndices(mockIndices);

    const { result } = renderHook(() => useQueryIndices());
    expect(result.current).toEqual({ indices: ['index-1', 'index-2'], isLoading: false });
  });
});
