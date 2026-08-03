/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { ProjectRouting } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { useTimeRangeMetadata } from './use_time_range_metadata';

const mockRefetch = jest.fn();
const mockUseKibanaContextForPlugin = jest.fn();
const mockGetBooleanValue = jest.fn();

jest.mock('./use_fetcher', () => ({
  ...jest.requireActual('./use_fetcher'),
  useFetcher: jest.fn(() => ({
    data: undefined,
    refetch: mockRefetch,
    status: 'success',
  })),
}));

jest.mock('./use_kibana', () => ({
  useKibanaContextForPlugin: () => mockUseKibanaContextForPlugin(),
}));

describe('useTimeRangeMetadata', () => {
  let projectRouting$: BehaviorSubject<ProjectRouting | undefined>;

  beforeEach(() => {
    projectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    mockUseKibanaContextForPlugin.mockReturnValue({
      services: {
        cps: {
          cpsManager: {
            getProjectRouting$: () => projectRouting$,
          },
        },
        featureFlags: {
          getBooleanValue: mockGetBooleanValue,
        },
      },
    });
    mockGetBooleanValue.mockReturnValue(true);
    mockRefetch.mockClear();
  });

  it('refetches when CPS project routing changes and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() =>
      useTimeRangeMetadata({
        dataSource: 'host',
        start: 'now-15m',
        end: 'now',
      })
    );

    expect(mockRefetch).toHaveBeenCalledTimes(1);

    act(() => projectRouting$.next('_alias:*'));
    expect(mockRefetch).toHaveBeenCalledTimes(2);

    unmount();
    act(() => projectRouting$.next('_alias:_origin'));
    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it('does not refetch on project routing changes when Infra CPS is disabled', () => {
    mockGetBooleanValue.mockReturnValue(false);
    renderHook(() =>
      useTimeRangeMetadata({
        dataSource: 'host',
        start: 'now-15m',
        end: 'now',
      })
    );

    act(() => projectRouting$.next('_alias:*'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
