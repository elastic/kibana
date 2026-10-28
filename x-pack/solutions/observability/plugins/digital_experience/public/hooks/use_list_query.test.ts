/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { ApplicationSource } from '../../common/types/applications';
import { useEnvironment } from './use_environment';
import { useListQuery } from './use_list_query';
import { useSourceFilter } from './use_source_filter';
import { useTimeRange } from './use_time_range';

jest.mock('./use_environment');
jest.mock('./use_source_filter');
jest.mock('./use_time_range');

const timeRange = { rangeFrom: 'now-15m', rangeTo: 'now' };

const mockQuery = ({
  environment,
  sourceFilter,
}: { environment?: string; sourceFilter?: ApplicationSource } = {}) => {
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange: jest.fn() });
  jest.mocked(useEnvironment).mockReturnValue({ environment, setEnvironment: jest.fn() });
  jest.mocked(useSourceFilter).mockReturnValue({ sourceFilter, setSourceFilter: jest.fn() });
};

describe('useListQuery', () => {
  it('has only the time range without filters', () => {
    mockQuery();

    // No empty keys, so a link to the list matches its URL exactly.
    expect(renderHook(() => useListQuery()).result.current).toEqual(timeRange);
  });

  it('adds the environment and the source filter when set', () => {
    mockQuery({ environment: 'production', sourceFilter: 'classic' });

    expect(renderHook(() => useListQuery()).result.current).toEqual({
      ...timeRange,
      environment: 'production',
      sourceFilter: 'classic',
    });
  });

  it('returns the same object while the query does not change', () => {
    mockQuery({ environment: 'production' });
    const { result, rerender } = renderHook(() => useListQuery());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
