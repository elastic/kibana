/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { useLoadingState } from './use_loading_state';
import { useDatePickerContext, type UseDateRangeProviderProps } from './use_date_picker';
import { BehaviorSubject, Subject, Subscription, skip } from 'rxjs';
import { useReloadRequestTimeContext } from '../../../hooks/use_reload_request_time';

jest.mock('./use_date_picker');
jest.mock('../../../hooks/use_reload_request_time');

const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;

const useRequestTimeContextMock = useReloadRequestTimeContext as jest.MockedFunction<
  typeof useReloadRequestTimeContext
>;

describe('useLoadingState', () => {
  let subscription: Subscription;

  const autoRefreshTick$ = new Subject();
  const autoRefreshConfig$ = new BehaviorSubject<
    UseDateRangeProviderProps['autoRefresh'] | undefined
  >({ interval: 1000, isPaused: false });

  const updateReloadRequestTimeMock = jest.fn();

  const mockRequestTimeContext = () => {
    useRequestTimeContextMock.mockReturnValue({
      updateReloadRequestTime: updateReloadRequestTimeMock,
      reloadRequestTime: 0,
    });
  };

  const mockDatePickerContext = () => {
    useDatePickerContextMock.mockReturnValue({
      autoRefreshConfig$,
      autoRefreshTick$,
    } as unknown as ReturnType<typeof useDatePickerContext>);
  };

  beforeEach(() => {
    subscription = new Subscription();
    jest.useFakeTimers();
    mockRequestTimeContext();
    mockDatePickerContext();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    subscription.unsubscribe();
  });

  it('should set isAutoRefreshRequestPending to true when there are requests pending', async () => {
    const { result, unmount } = renderHook(() => useLoadingState());

    let receivedValue = false;
    subscription.add(
      result.current.isAutoRefreshRequestPending$.pipe(skip(1)).subscribe((value) => {
        receivedValue = value;
      })
    );

    act(() => {
      autoRefreshTick$.next(null); // auto-refresh ticks
      result.current.requestState$.next('running'); // simulates a new request
      result.current.requestState$.next('done'); // simulates completion of a request
      result.current.requestState$.next('running');
      result.current.requestState$.next('running');
      result.current.requestState$.next('running');
      autoRefreshTick$.next(null); // auto-refresh ticks
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(receivedValue).toBe(true));

    unmount();
  });

  it('should set isAutoRefreshRequestPending to false when all requests complete', async () => {
    const { result, unmount } = renderHook(() => useLoadingState());

    let receivedValue = true;
    subscription.add(
      result.current.isAutoRefreshRequestPending$.subscribe((value) => {
        receivedValue = value;
      })
    );

    act(() => {
      autoRefreshTick$.next(null); // auto-refresh ticks
      result.current.requestState$.next('running'); // simulates a new request
      result.current.requestState$.next('done'); // simulates completion of a request
      result.current.requestState$.next('running');
      result.current.requestState$.next('done');
      autoRefreshTick$.next(null); // auto-refresh ticks
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(receivedValue).toBe(false));

    unmount();
  });

  it('should call updateRequestTime on auto-refresh tick when no requests are pending', () => {
    const { unmount } = renderHook(() => useLoadingState());

    // only the mount call
    expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(1);

    act(() => {
      autoRefreshTick$.next(null);
    });

    expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(2);

    unmount();
  });

  it('should call updateRequestTime on auto-refresh tick only after pending requests complete', () => {
    const { result, unmount } = renderHook(() => useLoadingState());

    act(() => {
      result.current.requestState$.next('running');
      autoRefreshTick$.next(null);
    });

    // only the mount call
    expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.requestState$.next('done');
      jest.runOnlyPendingTimers();
      autoRefreshTick$.next(null);
    });

    expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(2);

    unmount();
  });
});
