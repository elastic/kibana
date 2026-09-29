/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useStepPrevMetrics } from './use_step_prev_metrics';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

const mockUseReduxEsSearch = vi.fn();
vi.mock('../../../hooks/use_redux_es_search', () => {
  const mocked = {
    useReduxEsSearch: (...args: any[]) => mockUseReduxEsSearch(...args),
  };
  return { ...mocked, default: mocked };
});

const mockUrlParams = vi.fn();
vi.mock('../../../hooks', () => {
  const mocked = {
    useGetUrlParams: () => mockUrlParams(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-router-dom', () => {
  const mocked = {
    useParams: () => ({ checkGroupId: 'cg-1', stepIndex: '2', monitorId: 'monitor-1' }),
  };
  return { ...mocked, default: mocked };
});

describe('useStepPrevMetrics', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseReduxEsSearch.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => vi.clearAllMocks());

  it('queries the local synthetics index pattern when no remoteName is provided', () => {
    renderHook(() => useStepPrevMetrics());

    expect(mockUseReduxEsSearch).toHaveBeenCalledTimes(2);
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      [undefined],
      expect.any(Object)
    );
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      [undefined],
      expect.any(Object)
    );
  });

  it('queries the CCS-prefixed index when remoteName is in the URL', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    renderHook(() => useStepPrevMetrics());

    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
    expect(mockUseReduxEsSearch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
  });
});
