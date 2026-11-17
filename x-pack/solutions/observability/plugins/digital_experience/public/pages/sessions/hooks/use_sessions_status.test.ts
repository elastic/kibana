/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { SessionsStatus } from '../../../../common/sessions';
import { useApiClient } from '../../../hooks/use_api_client';
import { useSessionsStatus } from './use_sessions_status';

jest.mock('../../../hooks/use_api_client');

const statusOf = (reason: string) => ({ reason } as SessionsStatus);

/** A promise and the function that resolves it. */
const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('useSessionsStatus', () => {
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
    const { result } = renderHook(() => useSessionsStatus());
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
});
