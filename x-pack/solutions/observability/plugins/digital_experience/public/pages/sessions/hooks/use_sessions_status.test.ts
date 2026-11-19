/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { SessionsStatus } from '../../../../common/sessions';
import { useApiClient } from '../../../hooks/use_api_client';
import { STATUS_REFRESH_MS, useSessionsStatusState } from './use_sessions_status';

const STATUS_ENDPOINT = 'GET /internal/digital_experience/sessions/status';
const ENABLE_ENDPOINT = 'POST /internal/digital_experience/sessions/enable';

jest.mock('../../../hooks/use_api_client');

/** A status the tests tell apart by the point its summaries reached. */
const statusOf = (marker: string) =>
  ({ installed: true, summarizedUntil: marker } as SessionsStatus);

/** A promise and the function that resolves it. */
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('useSessionsStatusState', () => {
  const fetch = jest.fn();

  beforeEach(() => {
    jest.mocked(useApiClient).mockReturnValue({ fetch } as never);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('keeps what enabling answered over a status requested before enabling finished', async () => {
    const poll = deferred<SessionsStatus>();
    fetch
      .mockResolvedValueOnce(statusOf('before'))
      .mockReturnValueOnce(poll.promise)
      .mockResolvedValueOnce(statusOf('enabled'))
      .mockResolvedValueOnce(statusOf('after'));
    const { result } = renderHook(() => useSessionsStatusState());
    await waitFor(() => expect(result.current.status).toEqual(statusOf('before')));

    // A poll starts, then enabling finishes before the poll answers.
    act(() => result.current.refresh());
    await act(() => result.current.enable());
    expect(result.current.status).toEqual(statusOf('enabled'));

    await act(async () => poll.resolve(statusOf('before')));
    expect(result.current.status).toEqual(statusOf('enabled'));

    // A status requested after enabling replaces it.
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.status).toEqual(statusOf('after')));
  });

  describe('setting sessions up by itself', () => {
    const notSetUp = (autoEnable: boolean) => ({ installed: false, autoEnable } as SessionsStatus);

    const respondWith = (status: SessionsStatus, enable: () => Promise<SessionsStatus>) =>
      fetch.mockImplementation((endpoint: string) =>
        endpoint === ENABLE_ENDPOINT ? enable() : Promise.resolve(status)
      );

    const enableCalls = () => fetch.mock.calls.filter(([endpoint]) => endpoint === ENABLE_ENDPOINT);

    it('sets them up when the status says the user can', async () => {
      respondWith(notSetUp(true), async () => statusOf('enabled'));
      const { result } = renderHook(() => useSessionsStatusState());

      await waitFor(() => expect(result.current.status).toEqual(statusOf('enabled')));
      expect(enableCalls()).toHaveLength(1);
    });

    it('waits to be asked when the user can not', async () => {
      respondWith(notSetUp(false), async () => statusOf('enabled'));
      const { result } = renderHook(() => useSessionsStatusState());

      await waitFor(() => expect(result.current.status).toEqual(notSetUp(false)));
      expect(enableCalls()).toHaveLength(0);
    });

    it('tries once, and keeps the error for the prompt to show', async () => {
      const failure = new Error('Could not enable sessions');
      respondWith(notSetUp(true), async () => {
        throw failure;
      });
      const { result } = renderHook(() => useSessionsStatusState());

      await waitFor(() => expect(result.current.enableError).toBe(failure));
      act(() => result.current.refresh());
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
      expect(enableCalls()).toHaveLength(1);
    });
  });

  it('checks the status again while sessions rebuild, and stops once they are built', async () => {
    jest.useFakeTimers();
    try {
      fetch
        .mockResolvedValueOnce({ installed: true, rebuilding: true } as SessionsStatus)
        .mockResolvedValue({ installed: true, rebuilding: false } as SessionsStatus);
      const { result } = renderHook(() => useSessionsStatusState());
      await waitFor(() => expect(result.current.status?.rebuilding).toBe(true));

      await act(async () => jest.advanceTimersByTime(STATUS_REFRESH_MS));
      await waitFor(() => expect(result.current.status?.rebuilding).toBe(false));
      await act(async () => jest.advanceTimersByTime(3 * STATUS_REFRESH_MS));

      expect(fetch.mock.calls.filter(([endpoint]) => endpoint === STATUS_ENDPOINT)).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
