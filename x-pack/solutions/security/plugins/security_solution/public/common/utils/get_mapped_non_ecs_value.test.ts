/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineNonEcsData } from '@kbn/timelines-plugin/common';
import { getMappedNonEcsValue, useGetMappedNonEcsValue } from './get_mapped_non_ecs_value';
import { renderHook } from '@testing-library/react-hooks';

describe('getMappedNonEcsValue', () => {
  it('should return the correct value', () => {
    const data: TimelineNonEcsData[] = [{ field: 'field1', value: ['value1'] }];
    const fieldName = 'field1';
    const result = getMappedNonEcsValue({ data, fieldName });
    expect(result).toEqual(['value1']);
  });

  it('should return undefined if item is null', () => {
    const data: TimelineNonEcsData[] = [{ field: 'field1', value: ['value1'] }];
    const fieldName = 'field2';
    const result = getMappedNonEcsValue({ data, fieldName });
    expect(result).toEqual(undefined);
  });

  it('should return undefined if item.value is null', () => {
    const data: TimelineNonEcsData[] = [{ field: 'field1', value: null }];
    const fieldName = 'non_existent_field';
    const result = getMappedNonEcsValue({ data, fieldName });
    expect(result).toEqual(undefined);
  });

  it('should return undefined if data is undefined', () => {
    const data = undefined;
    const fieldName = 'field1';
    const result = getMappedNonEcsValue({ data, fieldName });
    expect(result).toEqual(undefined);
  });

  it('should return undefined if data is empty', () => {
    const data: TimelineNonEcsData[] = [];
    const fieldName = 'field1';
    const result = getMappedNonEcsValue({ data, fieldName });
    expect(result).toEqual(undefined);
  });
});

describe('useGetMappedNonEcsValue', () => {
  it('should return the correct value', () => {
    const data: TimelineNonEcsData[] = [{ field: 'field1', value: ['value1'] }];
    const fieldName = 'field1';
    const { result } = renderHook(() => useGetMappedNonEcsValue({ data, fieldName }));
    expect(result.current).toEqual(['value1']);
  });
});
