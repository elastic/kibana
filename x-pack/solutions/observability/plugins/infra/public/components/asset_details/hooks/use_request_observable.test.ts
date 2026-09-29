/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { act, waitFor, renderHook } from '@testing-library/react';
import { useRequestObservable } from './use_request_observable';
import { type RequestState, useLoadingStateContext } from './use_loading_state';
import { useDatePickerContext, type UseDateRangeProviderProps } from './use_date_picker';
import { useReloadRequestTimeContext } from '../../../hooks/use_reload_request_time';
import { BehaviorSubject } from 'rxjs';

vi.mock('./use_loading_state');
vi.mock('./use_date_picker');
vi.mock('../../../hooks/use_reload_request_time');

const useLoadingStateContextMock = useLoadingStateContext as MockedFunction<
  typeof useLoadingStateContext
>;
const useDatePickerContextMock = useDatePickerContext as MockedFunction<
  typeof useDatePickerContext
>;

const useReloadRequestTimeMock = useReloadRequestTimeContext as MockedFunction<
  typeof useReloadRequestTimeContext
>;

describe('useRequestObservable', () => {
  const isAutoRefreshRequestPendingMock$ = new BehaviorSubject<boolean>(false);

  const autoRefreshConfig$ = new BehaviorSubject<
    UseDateRangeProviderProps['autoRefresh'] | undefined
  >({ interval: 5000, isPaused: false });

  const requestStateMock$ = new BehaviorSubject<RequestState | null>(null);
  // needed to spy on `next` function
  requestStateMock$.next = vi.fn();

  const mockUseRequestTimeMock = () => {
    useReloadRequestTimeMock.mockReturnValue({
      updateReloadRequestTime: vi.fn(() => {}),
      reloadRequestTime: 0,
    });
  };

  const mockUseLoadingStateContextMock = () => {
    useLoadingStateContextMock.mockReturnValue({
      requestState$: requestStateMock$,
      isAutoRefreshRequestPending$: isAutoRefreshRequestPendingMock$,
    });
  };

  const mockDatePickerContext = () => {
    useDatePickerContextMock.mockReturnValue({
      autoRefreshConfig$,
    } as unknown as ReturnType<typeof useDatePickerContext>);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockDatePickerContext();
    mockUseRequestTimeMock();
    mockUseLoadingStateContextMock();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should process a valid request function', async () => {
    const { result, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      result.current.request$.next(() => Promise.resolve());

      vi.runOnlyPendingTimers();
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should be able to make new requests if isAutoRefreshRequestPending is false', async () => {
    const { result, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      isAutoRefreshRequestPendingMock$.next(false);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should block new requests when isAutoRefreshRequestPending is true', async () => {
    const { result, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      isAutoRefreshRequestPendingMock$.next(false);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());

      isAutoRefreshRequestPendingMock$.next(true);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should not block new requests when auto-refresh is paused', async () => {
    const { result, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      autoRefreshConfig$.next({ isPaused: true, interval: 5000 });

      // simulating requests
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledTimes(8);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should complete the request when an error is thrown', async () => {
    const { result, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      autoRefreshConfig$.next({ isPaused: true, interval: 5000 });
      // simulating requests
      result.current.request$.next(() => Promise.reject());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('error');

    unmount();
  });
});
