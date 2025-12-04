/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useProductFeatureKeys } from './use_product_feature_keys';
import { useKibana } from '../lib/kibana';
import { BehaviorSubject } from 'rxjs';

jest.mock('../lib/kibana');

describe('useProductFeatureKeys', () => {
  const mockUseKibana = useKibana as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty Set when productFeatureKeys is null', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(null);

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result } = renderHook(() => useProductFeatureKeys());

    expect(result.current).toEqual(new Set());
    expect(result.current.size).toBe(0);
  });

  it('should return empty Set when productFeatureKeys is undefined', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
      undefined as unknown as null
    );

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result } = renderHook(() => useProductFeatureKeys());

    expect(result.current).toEqual(new Set());
    expect(result.current.size).toBe(0);
  });

  it('should return empty Set when productFeatureKeys is empty', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(new Set<string>([]));

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result } = renderHook(() => useProductFeatureKeys());

    expect(result.current).toEqual(new Set());
    expect(result.current.size).toBe(0);
  });

  it('should return Set with feature keys when productFeatureKeys has values', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
      new Set<string>(['feature1', 'feature2', 'feature3'])
    );

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result } = renderHook(() => useProductFeatureKeys());

    expect(result.current.size).toBe(3);
    expect(result.current.has('feature1')).toBe(true);
    expect(result.current.has('feature2')).toBe(true);
    expect(result.current.has('feature3')).toBe(true);
    expect(result.current.has('feature4')).toBe(false);
  });

  it('should return Set with single feature key', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
      new Set<string>(['graph_visualization'])
    );

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result } = renderHook(() => useProductFeatureKeys());

    expect(result.current.size).toBe(1);
    expect(result.current.has('graph_visualization')).toBe(true);
  });

  it('should update when productFeatureKeys observable emits new value', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
      new Set<string>(['feature1'])
    );

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result, rerender } = renderHook(() => useProductFeatureKeys());

    expect(result.current.size).toBe(1);
    expect(result.current.has('feature1')).toBe(true);

    // Update the observable
    act(() => {
      productFeatureKeys$.next(new Set<string>(['feature1', 'feature2']));
    });
    rerender();

    expect(result.current.size).toBe(2);
    expect(result.current.has('feature1')).toBe(true);
    expect(result.current.has('feature2')).toBe(true);
  });

  it('should return memoized value when productFeatureKeys does not change', () => {
    const featureSet = new Set<string>(['feature1', 'feature2']);
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(featureSet);

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result, rerender } = renderHook(() => useProductFeatureKeys());

    const firstResult = result.current;
    rerender();
    const secondResult = result.current;

    // Should return the same reference (memoized)
    expect(firstResult).toBe(secondResult);
  });

  it('should handle transition from null to Set', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(null);

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result, rerender } = renderHook(() => useProductFeatureKeys());

    expect(result.current).toEqual(new Set());
    expect(result.current.size).toBe(0);

    // Update to non-null
    act(() => {
      productFeatureKeys$.next(new Set<string>(['feature1']));
    });
    rerender();

    expect(result.current.size).toBe(1);
    expect(result.current.has('feature1')).toBe(true);
  });

  it('should handle transition from Set to null', () => {
    const productFeatureKeys$ = new BehaviorSubject<Set<string> | null>(
      new Set<string>(['feature1', 'feature2'])
    );

    mockUseKibana.mockReturnValue({
      services: {
        productFeatureKeys$,
      },
    });

    const { result, rerender } = renderHook(() => useProductFeatureKeys());

    expect(result.current.size).toBe(2);

    // Update to null
    act(() => {
      productFeatureKeys$.next(null);
    });
    rerender();

    expect(result.current).toEqual(new Set());
    expect(result.current.size).toBe(0);
  });
});
