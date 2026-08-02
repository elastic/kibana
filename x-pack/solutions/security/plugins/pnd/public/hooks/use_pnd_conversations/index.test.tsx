/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { API_VERSIONS, PND_CONVERSATIONS_URL } from '@kbn/pnd-common';

import { createPndTestProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { usePndConversations } from '.';

const conversation = {
  correlationId: 'ad-1',
  createdAt: '2026-08-03T10:00:00.000Z',
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  kind: 'investigation' as const,
  title: 'Suspicious activity',
  updatedAt: '2026-08-03T10:05:00.000Z',
};

describe('usePndConversations', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue({ conversations: [conversation], total: 1 });
  });

  const render = (enabled = true) => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    return renderHook(() => usePndConversations({ enabled }), { wrapper: Providers });
  };

  it('lists the PND conversations in the space', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.data?.conversations).toEqual([conversation]));
  });

  it('requests the versioned internal conversations route', async () => {
    render();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(PND_CONVERSATIONS_URL, {
        query: {},
        version: API_VERSIONS.internal.v1,
      })
    );
  });

  it('sends kind, page and perPage when paging a group', async () => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    renderHook(() => usePndConversations({ kind: 'incident', page: 2, perPage: 10 }), {
      wrapper: Providers,
    });

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(PND_CONVERSATIONS_URL, {
        query: { kind: 'incident', page: 2, perPage: 10 },
        version: API_VERSIONS.internal.v1,
      })
    );
  });

  it('reads nothing when disabled', () => {
    render(false);

    expect(get).not.toHaveBeenCalled();
  });

  it('surfaces a 403 rather than pretending there are no conversations', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    const { result } = render();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
