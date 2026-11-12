/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiClient } from './use_api_client';
import { messageOfRequestError, useSavedViews } from './use_saved_views';

jest.mock('./use_api_client');

const fetch = jest.fn();
const apiClient = { fetch } as unknown as ReturnType<typeof useApiClient>;

const VIEW = { id: 'a', name: 'checkout' };

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(useApiClient).mockReturnValue(apiClient);
  fetch.mockImplementation(async (endpoint: string) =>
    endpoint.startsWith('GET') ? { views: [VIEW] } : VIEW
  );
});

describe('useSavedViews', () => {
  it('lists the views when it mounts', async () => {
    const { result } = renderHook(() => useSavedViews());

    await waitFor(() => expect(result.current.views).toEqual([VIEW]));
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/digital_experience/views',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('saves a view and lists the views again', async () => {
    const { result } = renderHook(() => useSavedViews());
    await waitFor(() => expect(result.current.views).toHaveLength(1));
    fetch.mockClear();

    await act(async () => {
      await result.current.create({ name: 'new' });
    });

    expect(fetch).toHaveBeenCalledWith('POST /internal/digital_experience/views', {
      params: { body: { name: 'new' } },
    });
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        'GET /internal/digital_experience/views',
        expect.anything()
      )
    );
  });

  it('saves a view again under its id, and deletes one, each followed by the list', async () => {
    const { result } = renderHook(() => useSavedViews());
    await waitFor(() => expect(result.current.views).toHaveLength(1));
    fetch.mockClear();

    await act(async () => {
      await result.current.update('a', { name: 'checkout', kuery: 'a: b' });
      await result.current.remove('a');
    });

    expect(fetch).toHaveBeenCalledWith('PUT /internal/digital_experience/views/{id}', {
      params: { path: { id: 'a' }, body: { name: 'checkout', kuery: 'a: b' } },
    });
    expect(fetch).toHaveBeenCalledWith('DELETE /internal/digital_experience/views/{id}', {
      params: { path: { id: 'a' } },
    });
    await waitFor(() =>
      expect(
        fetch.mock.calls.filter(([endpoint]) => endpoint.startsWith('GET')).length
      ).toBeGreaterThanOrEqual(1)
    );
  });

  it('rejects a change that failed, and does not list again', async () => {
    const { result } = renderHook(() => useSavedViews());
    await waitFor(() => expect(result.current.views).toHaveLength(1));
    fetch.mockClear();
    fetch.mockRejectedValue(new Error('Conflict'));

    await expect(result.current.create({ name: 'dup' })).rejects.toThrow('Conflict');

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('messageOfRequestError', () => {
  it('prefers what the server said, then the error’s own message', () => {
    expect(
      messageOfRequestError(Object.assign(new Error('Conflict'), { body: { message: 'Taken' } }))
    ).toBe('Taken');
    expect(messageOfRequestError(new Error('Network down'))).toBe('Network down');
    expect(messageOfRequestError('plain')).toBe('plain');
  });
});
