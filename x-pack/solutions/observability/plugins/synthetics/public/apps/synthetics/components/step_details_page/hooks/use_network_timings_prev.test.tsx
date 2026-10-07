/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNetworkTimingsPrevious24Hours } from './use_network_timings_prev';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

const mockUseReduxEsSearch = jest.fn();
jest.mock('../../../hooks/use_redux_es_search', () => ({
  useReduxEsSearch: (...args: any[]) => mockUseReduxEsSearch(...args),
}));

const mockUrlParams = jest.fn();
jest.mock('../../../hooks', () => ({
  useGetUrlParams: () => mockUrlParams(),
}));

jest.mock('../../monitor_details/hooks/use_journey_steps', () => ({
  useJourneySteps: () => ({
    currentStep: { '@timestamp': '2024-01-01T00:00:00.000Z' },
  }),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => ({ checkGroupId: 'cg-1', stepIndex: '2', monitorId: 'monitor-1' }),
}));

describe('useNetworkTimingsPrevious24Hours', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    mockUseReduxEsSearch.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => jest.clearAllMocks());

  it('queries the local synthetics index pattern when no remoteName is provided', () => {
    renderHook(() => useNetworkTimingsPrevious24Hours());

    expect(mockUseReduxEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      [undefined],
      expect.any(Object)
    );
  });

  it('queries the CCS-prefixed index when remoteName is in the URL', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    renderHook(() => useNetworkTimingsPrevious24Hours());

    expect(mockUseReduxEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
  });
});
