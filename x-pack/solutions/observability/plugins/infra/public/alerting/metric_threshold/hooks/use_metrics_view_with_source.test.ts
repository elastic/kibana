/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useMetricsViewWithSource } from './use_metrics_view_with_source';

const mockLoadSource = jest.fn();
const mockRefetchMetricsView = jest.fn();

const mockUseSourceContext = jest.fn();
const mockUseMetricsDataViewContext = jest.fn();

jest.mock('../../../containers/metrics_source', () => ({
  useSourceContext: () => mockUseSourceContext(),
  useMetricsDataViewContext: () => mockUseMetricsDataViewContext(),
}));

const buildSourceContext = (overrides: Record<string, unknown> = {}) => ({
  source: { id: 'default' },
  error: undefined,
  isLoading: false,
  loadSource: mockLoadSource,
  ...overrides,
});

const buildMetricsDataViewContext = (overrides: Record<string, unknown> = {}) => ({
  metricsView: { dataViewReference: { id: 'mock-id' } },
  error: undefined,
  loading: false,
  refetch: mockRefetchMetricsView,
  ...overrides,
});

describe('useMetricsViewWithSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSourceContext.mockReturnValue(buildSourceContext());
    mockUseMetricsDataViewContext.mockReturnValue(buildMetricsDataViewContext());
  });

  it('returns the metrics view and source from the underlying contexts', () => {
    const { result } = renderHook(() => useMetricsViewWithSource());

    expect(result.current.metricsView).toEqual({ dataViewReference: { id: 'mock-id' } });
    expect(result.current.source).toEqual({ id: 'default' });
  });

  describe('isLoading', () => {
    it('is true while the source configuration is being fetched', () => {
      mockUseSourceContext.mockReturnValue(buildSourceContext({ isLoading: true }));

      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.isLoading).toBe(true);
    });

    it('is true while the metrics data view is being resolved', () => {
      mockUseMetricsDataViewContext.mockReturnValue(buildMetricsDataViewContext({ loading: true }));

      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.isLoading).toBe(true);
    });

    it('is false when neither the source nor the data view are loading', () => {
      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error', () => {
    it('surfaces the source configuration error', () => {
      mockUseSourceContext.mockReturnValue(buildSourceContext({ error: 'Internal Server Error' }));

      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.error).toBe('Internal Server Error');
    });

    it('surfaces the metrics data view error message', () => {
      mockUseMetricsDataViewContext.mockReturnValue(
        buildMetricsDataViewContext({ error: new Error('Failed to resolve data view') })
      );

      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.error).toBe('Failed to resolve data view');
    });

    it('prefers the source error over the data view error', () => {
      mockUseSourceContext.mockReturnValue(buildSourceContext({ error: 'source error' }));
      mockUseMetricsDataViewContext.mockReturnValue(
        buildMetricsDataViewContext({ error: new Error('data view error') })
      );

      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.error).toBe('source error');
    });

    it('is undefined when neither context reports an error', () => {
      const { result } = renderHook(() => useMetricsViewWithSource());

      expect(result.current.error).toBeUndefined();
    });
  });

  describe('refetch', () => {
    it('reloads both the source configuration and the metrics data view', () => {
      const { result } = renderHook(() => useMetricsViewWithSource());

      act(() => {
        result.current.refetch();
      });

      expect(mockLoadSource).toHaveBeenCalledTimes(1);
      expect(mockRefetchMetricsView).toHaveBeenCalledTimes(1);
    });
  });
});
