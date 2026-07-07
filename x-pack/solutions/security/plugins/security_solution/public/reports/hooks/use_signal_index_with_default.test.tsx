/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useSignalIndexWithDefault } from './use_signal_index_with_default';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import { useSpaceId } from '../../common/hooks/use_space_id';

jest.mock('../../detections/containers/detection_engine/alerts/use_signal_index');
jest.mock('../../common/hooks/use_space_id');

const mockUseSignalIndex = useSignalIndex as jest.MockedFunction<typeof useSignalIndex>;
const mockUseSpaceId = useSpaceId as jest.MockedFunction<typeof useSpaceId>;

describe('useSignalIndexWithDefault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns signalIndexName when provided by useSignalIndex', () => {
    const mockSignalIndexName = '.alerts-security.alerts-custom';
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: mockSignalIndexName,
      signalIndexMappingOutdated: false,
      createDeSignalIndex: null,
    });
    mockUseSpaceId.mockReturnValue('default');

    const { result } = renderHook(() => useSignalIndexWithDefault());

    expect(result.current).toBe(mockSignalIndexName);
  });

  it('returns default index name when signalIndexName is null', () => {
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: false,
      signalIndexName: null,
      signalIndexMappingOutdated: null,
      createDeSignalIndex: null,
    });
    mockUseSpaceId.mockReturnValue('custom-space');

    const { result } = renderHook(() => useSignalIndexWithDefault());

    expect(result.current).toBe('.alerts-security.alerts-custom-space');
  });

  it('uses correct space ID in default index name', () => {
    const testCases = [
      { spaceId: 'default', expected: '.alerts-security.alerts-default' },
      { spaceId: 'custom-space', expected: '.alerts-security.alerts-custom-space' },
      { spaceId: 'space-123', expected: '.alerts-security.alerts-space-123' },
    ];

    testCases.forEach(({ spaceId, expected }) => {
      mockUseSignalIndex.mockReturnValue({
        loading: false,
        signalIndexExists: false,
        signalIndexName: null,
        signalIndexMappingOutdated: null,
        createDeSignalIndex: null,
      });
      mockUseSpaceId.mockReturnValue(spaceId);

      const { result } = renderHook(() => useSignalIndexWithDefault());

      expect(result.current).toBe(expected);
    });
  });

  it('memoizes result when dependencies do not change', () => {
    const mockSignalIndexName = '.alerts-security.alerts-test';
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: mockSignalIndexName,
      signalIndexMappingOutdated: false,
      createDeSignalIndex: null,
    });
    mockUseSpaceId.mockReturnValue('default');

    const { result, rerender } = renderHook(() => useSignalIndexWithDefault());
    const firstResult = result.current;

    rerender();
    expect(result.current).toBe(firstResult);
  });

  it('recalculates when signalIndexName changes', () => {
    mockUseSpaceId.mockReturnValue('default');

    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: '.alerts-security.alerts-first',
      signalIndexMappingOutdated: false,
      createDeSignalIndex: null,
    });

    const { result, rerender } = renderHook(() => useSignalIndexWithDefault());
    expect(result.current).toBe('.alerts-security.alerts-first');

    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: true,
      signalIndexName: '.alerts-security.alerts-second',
      signalIndexMappingOutdated: false,
      createDeSignalIndex: null,
    });

    rerender();
    expect(result.current).toBe('.alerts-security.alerts-second');
  });

  it('recalculates when spaceId changes', () => {
    mockUseSignalIndex.mockReturnValue({
      loading: false,
      signalIndexExists: false,
      signalIndexName: null,
      signalIndexMappingOutdated: null,
      createDeSignalIndex: null,
    });

    mockUseSpaceId.mockReturnValue('first-space');
    const { result, rerender } = renderHook(() => useSignalIndexWithDefault());
    expect(result.current).toBe('.alerts-security.alerts-first-space');

    mockUseSpaceId.mockReturnValue('second-space');
    rerender();
    expect(result.current).toBe('.alerts-security.alerts-second-space');
  });
});
