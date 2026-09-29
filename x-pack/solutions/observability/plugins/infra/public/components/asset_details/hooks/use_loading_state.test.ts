/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { act, waitFor, renderHook } from '@testing-library/react';
import { useLoadingState } from './use_loading_state';
import { useDatePickerContext, type UseDateRangeProviderProps } from './use_date_picker';
import { BehaviorSubject, EMPTY, of, Subject, Subscription, skip } from 'rxjs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchSessionState, waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';
import { useReloadRequestTimeContext } from '../../../hooks/use_reload_request_time';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

vi.mock('./use_date_picker');
vi.mock('../../../hooks/use_kibana');
vi.mock('../../../hooks/use_reload_request_time');

vi.mock('@kbn/data-plugin/public', async () => {
  const mocked = {
    ...(await vi.importActual('@kbn/data-plugin/public')),
    waitUntilNextSessionCompletes$: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const useDatePickerContextMock = useDatePickerContext as MockedFunction<
  typeof useDatePickerContext
>;

const useKibanaContextForPluginMock = useKibanaContextForPlugin as MockedFunction<
  typeof useKibanaContextForPlugin
>;

const waitUntilNextSessionCompletesMock$ = waitUntilNextSessionCompletes$ as MockedFunction<
  typeof waitUntilNextSessionCompletes$
>;

const useRequestTimeContextMock = useReloadRequestTimeContext as MockedFunction<
  typeof useReloadRequestTimeContext
>;

describe('useLoadingState', () => {
  let subscription: Subscription;

  const autoRefreshTick$ = new Subject();
  const autoRefreshConfig$ = new BehaviorSubject<
    UseDateRangeProviderProps['autoRefresh'] | undefined
  >({ interval: 1000, isPaused: false });

  const sessionState$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);

  const updateReloadRequestTimeMock = vi.fn();

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

  const mockUseKibana = () => {
    const dataPluginStartMock = dataPluginMock.createStartContract();
    useKibanaContextForPluginMock.mockReturnValue({
      services: {
        ...coreMock.createStart(),
        data: {
          ...dataPluginStartMock,
          search: {
            ...dataPluginStartMock.search,
            session: {
              ...dataPluginStartMock.search.session,
              state$: sessionState$,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  };

  beforeEach(() => {
    subscription = new Subscription();
    vi.useFakeTimers();
    // @ts-expect-error upgrade typescript v5.9.3
    waitUntilNextSessionCompletesMock$.mockReturnValue(of(SearchSessionState.None));
    mockRequestTimeContext();
    mockUseKibana();
    mockDatePickerContext();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
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
      vi.runOnlyPendingTimers();
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
      vi.runOnlyPendingTimers();
    });

    await waitFor(() => expect(receivedValue).toBe(false));

    unmount();
  });

  it('should not call updateRequestTime if waitUntilNextSessionCompletesMock$ returns empty', async () => {
    const { unmount } = renderHook(() => useLoadingState());

    // waitUntilNextSessionCompletes$ returns EMPTY when the status is loading or none
    sessionState$.next(SearchSessionState.Loading);
    waitUntilNextSessionCompletesMock$.mockReturnValue(EMPTY);

    act(() => {
      autoRefreshTick$.next(null);
      vi.runOnlyPendingTimers();
    });

    // only the mount call must  happen
    await waitFor(() => expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(1));

    unmount();
  });

  it('should call updateRequestTime when waitUntilNextSessionCompletesMock$ returns', async () => {
    const { unmount } = renderHook(() => useLoadingState());

    // waitUntilNextSessionCompletes$ returns something when the status is Completed or BackgroundCompleted
    sessionState$.next(SearchSessionState.Loading);
    waitUntilNextSessionCompletesMock$.mockReturnValue(of(SearchSessionState.Completed));

    act(() => {
      autoRefreshTick$.next(null);
      vi.runOnlyPendingTimers();
    });

    await waitFor(() => expect(updateReloadRequestTimeMock).toHaveBeenCalledTimes(2));

    unmount();
  });
});
