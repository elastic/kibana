/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCorrelationTypeRecommendation } from './use_correlation_type_recommendation';

describe('useCorrelationTypeRecommendation', () => {
  it('returns undefined when no rules are selected', () => {
    const { result } = renderHook(() =>
      useCorrelationTypeRecommendation({
        selectedRules: [],
        groupByFields: ['host.name'],
        currentType: 'temporal',
      })
    );
    expect(result.current).toBeUndefined();
  });

  describe('single rule selected', () => {
    it('recommends event_count for a single rule without network fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['host.name'],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'event_count',
        confidence: 'medium',
        reason: expect.stringContaining('volume spikes'),
      });
    });

    it('recommends value_count when group-by includes IP fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['source.ip'],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'value_count',
        confidence: 'medium',
        reason: expect.stringContaining('breadth of impact'),
      });
    });

    it('recommends value_count when group-by includes port fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['destination.port'],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'value_count',
        confidence: 'medium',
        reason: expect.stringContaining('breadth of impact'),
      });
    });

    it('recommends value_count when group-by includes domain fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1'],
          groupByFields: ['dns.question.domain'],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'value_count',
        confidence: 'medium',
        reason: expect.stringContaining('breadth of impact'),
      });
    });
  });

  describe('two rules selected', () => {
    it('recommends temporal with high confidence when group-by includes user fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2'],
          groupByFields: ['user.name'],
          currentType: 'event_count',
        })
      );
      expect(result.current).toEqual({
        type: 'temporal',
        confidence: 'high',
        reason: expect.stringContaining('signal convergence'),
      });
    });

    it('recommends temporal with high confidence when group-by includes host fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2'],
          groupByFields: ['host.name'],
          currentType: 'event_count',
        })
      );
      expect(result.current).toEqual({
        type: 'temporal',
        confidence: 'high',
        reason: expect.stringContaining('signal convergence'),
      });
    });

    it('recommends temporal with low confidence without entity fields', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2'],
          groupByFields: ['event.category'],
          currentType: 'event_count',
        })
      );
      expect(result.current).toEqual({
        type: 'temporal',
        confidence: 'low',
        reason: expect.stringContaining('consider adding entity fields'),
      });
    });
  });

  describe('three or more rules selected', () => {
    it('recommends temporal_ordered with high confidence for 3 rules', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['rule-1', 'rule-2', 'rule-3'],
          groupByFields: ['host.name'],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'temporal_ordered',
        confidence: 'high',
        reason: expect.stringContaining('attack chain'),
      });
    });

    it('recommends temporal_ordered with high confidence for 5 rules', () => {
      const { result } = renderHook(() =>
        useCorrelationTypeRecommendation({
          selectedRules: ['r1', 'r2', 'r3', 'r4', 'r5'],
          groupByFields: [],
          currentType: 'temporal',
        })
      );
      expect(result.current).toEqual({
        type: 'temporal_ordered',
        confidence: 'high',
        reason: expect.stringContaining('attack chain'),
      });
    });
  });

  it('memoizes and returns the same reference for identical inputs', () => {
    const props = {
      selectedRules: ['rule-1', 'rule-2'],
      groupByFields: ['host.name'],
      currentType: 'event_count',
    };
    const { result, rerender } = renderHook((p) => useCorrelationTypeRecommendation(p), {
      initialProps: props,
    });
    const firstResult = result.current;
    rerender(props);
    expect(result.current).toBe(firstResult);
  });
});
