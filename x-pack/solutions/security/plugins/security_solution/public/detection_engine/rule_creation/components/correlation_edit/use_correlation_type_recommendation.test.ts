/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCorrelationTypeRecommendation } from './use_correlation_type_recommendation';

const mockHttpPost = jest.fn();

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      http: {
        post: mockHttpPost,
      },
    },
  }),
}));

describe('useCorrelationTypeRecommendation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockHttpPost.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns undefined recommendation and not loading when no rules are selected', () => {
    const { result } = renderHook(() =>
      useCorrelationTypeRecommendation({
        selectedRules: [],
        groupByFields: ['host.name'],
        currentType: 'temporal',
      })
    );
    expect(result.current.recommendation).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('calls the server API with correct parameters after debounce', async () => {
    const serverResponse = {
      type: 'event_count',
      confidence: 'medium',
      reason: 'Single rule with alerts suggests detecting volume spikes',
      stats: {
        alertCountPerRule: { 'rule-1': 42 },
        groupByCardinality: { 'host.name': 15 },
        avgTimeBetweenAlerts: 30000,
      },
    };
    mockHttpPost.mockResolvedValue(serverResponse);

    const { result } = renderHook(() =>
      useCorrelationTypeRecommendation({
        selectedRules: ['rule-1'],
        groupByFields: ['host.name'],
        currentType: 'temporal',
        timespan: '5m',
      })
    );

    expect(result.current.isLoading).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockHttpPost).toHaveBeenCalledWith(
      '/internal/security_solution/correlation/recommend_type',
      {
        version: '1',
        body: JSON.stringify({
          rules: ['rule-1'],
          groupByFields: ['host.name'],
          timespan: '5m',
        }),
      }
    );

    expect(result.current.recommendation).toEqual(serverResponse);
  });

  it('returns server response with stats when API succeeds', async () => {
    const serverResponse = {
      type: 'temporal',
      confidence: 'high',
      reason: 'Two rules with temporally close alerts',
      stats: {
        alertCountPerRule: { 'rule-1': 20, 'rule-2': 15 },
        groupByCardinality: { 'user.name': 8 },
        avgTimeBetweenAlerts: 5000,
      },
    };
    mockHttpPost.mockResolvedValue(serverResponse);

    const { result } = renderHook(() =>
      useCorrelationTypeRecommendation({
        selectedRules: ['rule-1', 'rule-2'],
        groupByFields: ['user.name'],
        currentType: 'event_count',
      })
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.recommendation).toEqual(serverResponse);
    expect(result.current.recommendation?.stats).toBeDefined();
  });

  describe('fallback to client-side heuristics when API fails', () => {
    beforeEach(() => {
      mockHttpPost.mockRejectedValue(new Error('Network error'));
    });

    it('recommends event_count for a single rule without network fields', async () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['host.name'],
          currentType: 'temporal',
        })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendation).toEqual({
        type: 'event_count',
        confidence: 'medium',
        reason: expect.stringContaining('volume spikes'),
      });
    });

    it('recommends value_count when group-by includes IP fields', async () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['source.ip'],
          currentType: 'temporal',
        })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendation).toEqual({
        type: 'value_count',
        confidence: 'medium',
        reason: expect.stringContaining('breadth of impact'),
      });
    });

    it('recommends temporal with high confidence when group-by includes user fields', async () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2'],
          groupByFields: ['user.name'],
          currentType: 'event_count',
        })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendation).toEqual({
        type: 'temporal',
        confidence: 'high',
        reason: expect.stringContaining('signal convergence'),
      });
    });

    it('recommends temporal_ordered with high confidence for 3+ rules', async () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2', 'rule-3'],
          groupByFields: ['host.name'],
          currentType: 'temporal',
        })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendation).toEqual({
        type: 'temporal_ordered',
        confidence: 'high',
        reason: expect.stringContaining('attack chain'),
      });
    });

    it('recommends temporal with low confidence without entity fields', async () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2'],
          groupByFields: ['event.category'],
          currentType: 'event_count',
        })
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.recommendation).toEqual({
        type: 'temporal',
        confidence: 'low',
        reason: expect.stringContaining('consider adding entity fields'),
      });
    });
  });

  it('debounces API calls', async () => {
    mockHttpPost.mockResolvedValue({
      type: 'event_count',
      confidence: 'medium',
      reason: 'test',
      stats: { alertCountPerRule: {}, groupByCardinality: {}, avgTimeBetweenAlerts: null },
    });

    const { rerender } = renderHook((props) => useCorrelationTypeRecommendation(props), {
      initialProps: {
        selectedRules: ['rule-1'],
        groupByFields: ['host.name'],
        currentType: 'temporal',
      },
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({
      selectedRules: ['rule-1', 'rule-2'],
      groupByFields: ['host.name'],
      currentType: 'temporal',
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockHttpPost).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledTimes(1);
    });

    expect(mockHttpPost).toHaveBeenCalledWith(
      '/internal/security_solution/correlation/recommend_type',
      expect.objectContaining({
        body: JSON.stringify({
          rules: ['rule-1', 'rule-2'],
          groupByFields: ['host.name'],
          timespan: '5m',
        }),
      })
    );
  });
});
