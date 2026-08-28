/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { stubIndexPattern } from '@kbn/data-plugin/common/stubs';

import { useSignalIndexPatterns } from './use_signal_index_patterns';
import { useFetchIndex } from '../../../../../common/containers/source';
import { useSignalIndex } from '../../../../../detections/containers/detection_engine/alerts/use_signal_index';

jest.mock('../../../../../common/containers/source');
jest.mock('../../../../../detections/containers/detection_engine/alerts/use_signal_index');

const mockUseSignalIndex = useSignalIndex as jest.Mock<Partial<ReturnType<typeof useSignalIndex>>>;
const mockUseFetchIndex = useFetchIndex as jest.Mock;

describe('useSignalIndexPatterns', () => {
  beforeEach(() => {
    mockUseSignalIndex.mockImplementation(() => ({
      loading: false,
      signalIndexName: 'mock-siem-signals-index',
    }));
    mockUseFetchIndex.mockImplementation(() => [
      false,
      { indexPatterns: stubIndexPattern, dataView: { id: 'stub-alerts-data-view' } },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the fetched signal index name and fields when both requests are done', () => {
    const { result } = renderHook(() => useSignalIndexPatterns());

    expect(result.current).toEqual({
      isSignalIndexLoading: false,
      signalIndexNames: ['mock-siem-signals-index'],
      isSignalIndexPatternLoading: false,
      signalIndexPatterns: stubIndexPattern,
      areSignalIndexPatternsReady: true,
    });
  });

  it('is not ready while the name request is in flight', () => {
    mockUseSignalIndex.mockImplementation(() => ({ loading: true, signalIndexName: null }));
    mockUseFetchIndex.mockImplementation(() => [false, { indexPatterns: stubIndexPattern }]);

    const { result } = renderHook(() => useSignalIndexPatterns());

    expect(result.current.isSignalIndexLoading).toBe(true);
    expect(result.current.signalIndexNames).toEqual([]);
    expect(result.current.areSignalIndexPatternsReady).toBe(false);
  });

  it('is not ready while the fields request is in flight', () => {
    mockUseFetchIndex.mockImplementation(() => [true, { indexPatterns: stubIndexPattern }]);

    const { result } = renderHook(() => useSignalIndexPatterns());

    expect(result.current.isSignalIndexPatternLoading).toBe(true);
    expect(result.current.areSignalIndexPatternsReady).toBe(false);
  });

  it('is not ready without a fetched dataView (fetch not started, or failed)', () => {
    // `useFetchIndex` reports `loading: false` with no `dataView` both before
    // its effect kicks off the request and after a fetch error — neither
    // state yields usable fields.
    mockUseFetchIndex.mockImplementation(() => [false, { indexPatterns: stubIndexPattern }]);

    const { result } = renderHook(() => useSignalIndexPatterns());

    expect(result.current.isSignalIndexPatternLoading).toBe(false);
    expect(result.current.areSignalIndexPatternsReady).toBe(false);
  });
});
