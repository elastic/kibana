/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { updateProviders } from '../../../../timelines/store/actions';
import { useNavigateToTimeline } from './use_navigate_to_timeline';
import * as mock from './mock_data';

jest.mock('../../../../timelines/hooks/use_create_timeline', () => ({
  useCreateTimeline: () => jest.fn(),
}));

jest.mock('../../../../common/hooks/use_selector');
(useDeepEqualSelector as jest.Mock).mockImplementation(() => ({
  defaultDataView: {
    id: 'someId',
  },
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
    useSelector: () => jest.fn(),
  };
});

jest.mock('uuid', () => ({
  v4: () => 'mock-id',
}));

const id = 'timeline-1';
const renderUseNavigatgeToTimeline = () => renderHook(() => useNavigateToTimeline());

describe('useAlertCountByRuleByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle an empty array', async () => {
    const { result } = renderUseNavigatgeToTimeline();
    const openTimelineWithFilters = result.current.openTimelineWithFilters;

    await openTimelineWithFilters([]);

    expect(mockDispatch.mock.calls[0][0]).toEqual(
      updateProviders({
        id,
        providers: [],
      })
    );
  });

  it('should handle 1 filter passed', async () => {
    const { result } = renderUseNavigatgeToTimeline();
    const openTimelineWithFilters = result.current.openTimelineWithFilters;

    await openTimelineWithFilters([[mock.hostFilter]]);

    expect(mockDispatch.mock.calls[0][0]).toEqual(
      updateProviders({
        id,
        providers: mock.dataProviderWithOneFilter,
      })
    );
  });

  it('should handle many filter passed ( AND query )', async () => {
    const { result } = renderUseNavigatgeToTimeline();
    const openTimelineWithFilters = result.current.openTimelineWithFilters;

    await openTimelineWithFilters([mock.ANDFilterGroup1]);

    expect(mockDispatch.mock.calls[0][0]).toEqual(
      updateProviders({
        id,
        providers: mock.dataProviderWithAndFilters,
      })
    );
  });

  it('should handle many AND filter groups passed ( OR query with ANDS )', async () => {
    const { result } = renderUseNavigatgeToTimeline();
    const openTimelineWithFilters = result.current.openTimelineWithFilters;

    await openTimelineWithFilters(mock.ORFilterGroup);

    expect(mockDispatch.mock.calls[0][0]).toEqual(
      updateProviders({
        id,
        providers: mock.dataProviderWithOrFilters,
      })
    );
  });
});
