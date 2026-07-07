/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useExpandableValues } from './use_expandable_values';

describe('useExpandableValues', () => {
  it('returns empty arrays and flags when values is null', () => {
    const { result } = renderHook(() =>
      useExpandableValues({ values: null, displayValuesLimit: 2 })
    );

    expect(result.current.visibleValues).toEqual([]);
    expect(result.current.overflownValues).toEqual([]);
    expect(result.current.isContentTooLarge).toBe(false);
    expect(result.current.hasMultipleValues).toBe(false);
    expect(result.current.isContentExpanded).toBe(false);
  });

  it('returns empty arrays and flags when values is undefined', () => {
    const { result } = renderHook(() =>
      useExpandableValues({ values: undefined, displayValuesLimit: 2 })
    );

    expect(result.current.visibleValues).toEqual([]);
    expect(result.current.overflownValues).toEqual([]);
    expect(result.current.isContentTooLarge).toBe(false);
    expect(result.current.hasMultipleValues).toBe(false);
    expect(result.current.isContentExpanded).toBe(false);
  });

  it('returns all values when total values are less than or equal to the limit', () => {
    const values = ['a', 'b'];
    const { result } = renderHook(() => useExpandableValues({ values, displayValuesLimit: 2 }));

    expect(result.current.visibleValues).toEqual(['a', 'b']);
    expect(result.current.overflownValues).toEqual([]);
    expect(result.current.isContentTooLarge).toBe(false);
    expect(result.current.hasMultipleValues).toBe(true);
    expect(result.current.isContentExpanded).toBe(false);
  });

  it('splits values into visible and overflown when total exceeds the limit', () => {
    const values = ['a', 'b', 'c', 'd'];
    const { result } = renderHook(() => useExpandableValues({ values, displayValuesLimit: 2 }));

    expect(result.current.visibleValues).toEqual(['a', 'b']);
    expect(result.current.overflownValues).toEqual(['c', 'd']);
    expect(result.current.isContentTooLarge).toBe(true);
    expect(result.current.hasMultipleValues).toBe(true);
  });

  it('uses default displayValuesLimit when not provided', () => {
    const values = ['a', 'b', 'c'];
    // default limit = 2
    const { result } = renderHook(() => useExpandableValues({ values }));

    expect(result.current.visibleValues).toEqual(['a', 'b']);
    expect(result.current.overflownValues).toEqual(['c']);
    expect(result.current.isContentTooLarge).toBe(true);
    expect(result.current.hasMultipleValues).toBe(true);
  });

  it('does not apply limit when displayValuesLimit is 0 or negative', () => {
    const values = ['a', 'b', 'c'];

    const { result: zeroLimitResult } = renderHook(() =>
      useExpandableValues({ values, displayValuesLimit: 0 })
    );

    expect(zeroLimitResult.current.visibleValues).toEqual(['a', 'b', 'c']);
    expect(zeroLimitResult.current.overflownValues).toEqual([]);
    expect(zeroLimitResult.current.isContentTooLarge).toBe(false);

    const { result: negativeLimitResult } = renderHook(() =>
      useExpandableValues({ values, displayValuesLimit: -1 })
    );

    expect(negativeLimitResult.current.visibleValues).toEqual(['a', 'b', 'c']);
    expect(negativeLimitResult.current.overflownValues).toEqual([]);
    expect(negativeLimitResult.current.isContentTooLarge).toBe(false);
  });

  it('toggles isContentExpanded when toggleContentExpansion is called', () => {
    const values = ['a', 'b', 'c'];

    const { result } = renderHook(() => useExpandableValues({ values, displayValuesLimit: 2 }));

    expect(result.current.isContentExpanded).toBe(false);

    act(() => {
      result.current.toggleContentExpansion();
    });

    expect(result.current.isContentExpanded).toBe(true);

    act(() => {
      result.current.toggleContentExpansion();
    });

    expect(result.current.isContentExpanded).toBe(false);
  });

  it('hasMultipleValues is true only when there is more than one value', () => {
    const { result: singleValueResult } = renderHook(() =>
      useExpandableValues({ values: ['only'], displayValuesLimit: 2 })
    );

    expect(singleValueResult.current.hasMultipleValues).toBe(false);

    const { result: multipleValuesResult } = renderHook(() =>
      useExpandableValues({ values: ['a', 'b'], displayValuesLimit: 2 })
    );

    expect(multipleValuesResult.current.hasMultipleValues).toBe(true);
  });
});
