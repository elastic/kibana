/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useMonitorErrors } from './use_monitor_errors';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';

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

vi.mock('../../../contexts', () => {
      const mocked = {
      useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
    };
      return { ...mocked, default: mocked };
    });

const mockUseSelectedLocation = vi.fn();
vi.mock('./use_selected_location', () => {
      const mocked = {
      useSelectedLocation: () => mockUseSelectedLocation(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      useParams: () => ({ monitorId: 'monitor-1' }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useTimeZone: () => 'UTC',
    };
      return { ...mocked, default: mocked };
    });

describe('useMonitorErrors', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
    });
    mockUseSelectedLocation.mockReturnValue({ label: 'US East' });
    mockUseReduxEsSearch.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => vi.clearAllMocks());

  it('queries the local synthetics index pattern when no remoteName is provided', () => {
    renderHook(() => useMonitorErrors());

    expect(mockUseReduxEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      expect.anything(),
      expect.any(Object)
    );
  });

  it('queries the CCS-prefixed index when remoteName is in the URL', () => {
    mockUrlParams.mockReturnValue({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      remoteName: 'remote-a',
    });

    renderHook(() => useMonitorErrors());

    expect(mockUseReduxEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
  });

  it('restricts error states to summary docs and excludes run-once checks', () => {
    renderHook(() => useMonitorErrors());

    expect(mockUseReduxEsSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([SUMMARY_FILTER, EXCLUDE_RUN_ONCE_FILTER]),
          }),
        }),
      }),
      expect.anything(),
      expect.any(Object)
    );
  });
});
