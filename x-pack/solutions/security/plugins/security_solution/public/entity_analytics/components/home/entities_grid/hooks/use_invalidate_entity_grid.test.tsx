/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook } from '@testing-library/react';
import { ENTITY_GRID_QUERY_KEY } from '../common';
import { useInvalidateEntityGrid } from './use_invalidate_entity_grid';

describe('useInvalidateEntityGrid', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren<{}>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('invalidates the grid queries and no others', () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useInvalidateEntityGrid(), { wrapper });

    result.current();

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [ENTITY_GRID_QUERY_KEY] });
  });

  it('returns the same handler across renders', () => {
    const { result, rerender } = renderHook(() => useInvalidateEntityGrid(), { wrapper });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
