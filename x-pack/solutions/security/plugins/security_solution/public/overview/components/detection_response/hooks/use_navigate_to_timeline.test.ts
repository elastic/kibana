/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { updateProviders } from '../../../../timelines/store/actions';
import { useNavigateToTimeline } from './use_navigate_to_timeline';
import * as mock from './mock_data';

vi.mock('../../../../timelines/hooks/use_create_timeline', () => {
  const mocked = {
    useCreateTimeline: () => vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../data_view_manager/hooks/use_signal_index_name', () => {
  const mocked = {
    useSignalIndexName: () => 'mock-signal-index',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../data_view_manager/hooks/use_security_default_patterns', () => {
  const mocked = {
    useSecurityDefaultPatterns: () => ({ id: 'someId', indexPatterns: [] }),
  };
  return { ...mocked, default: mocked };
});

const mockDispatch = vi.fn();
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
    useSelector: () => vi.fn(),
  };
});

vi.mock('uuid', () => {
  const mocked = {
    v4: () => 'mock-id',
  };
  return { ...mocked, default: mocked };
});

const id = 'timeline-1';
const renderUseNavigatgeToTimeline = () => renderHook(() => useNavigateToTimeline());

describe('useAlertCountByRuleByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
