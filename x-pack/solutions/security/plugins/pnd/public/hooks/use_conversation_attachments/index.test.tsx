/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { API_VERSIONS } from '@kbn/pnd-common';
import type { GetConversationAttachmentsResponse } from '@kbn/pnd-common';

import { createPndTestProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { useConversationAttachments } from '.';

const attachments: GetConversationAttachmentsResponse = {
  attachments: [
    {
      content: '## Coordinated credential theft',
      createdAt: '2026-08-06T00:00:00.000Z',
      description: 'Attack Discovery',
      id: 'pnd-attack-discovery',
      type: 'text',
      version: 1,
    },
  ],
  total: 1,
};

const REQUEST_OPTIONS = {
  query: { correlationId: 'ad-1' },
  version: API_VERSIONS.internal.v1,
};

describe('useConversationAttachments', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(attachments);
  });

  const render = ({
    correlationId = 'ad-1',
    conversationId = 'thread-1',
    enabled,
  }: {
    correlationId?: string;
    conversationId?: string;
    enabled?: boolean;
  } = {}) => {
    const { Providers } = createPndTestProviders({ services: { http: { get } } });

    return renderHook(
      () => useConversationAttachments({ correlationId, conversationId, enabled }),
      { wrapper: Providers }
    );
  };

  it('reads the attachments on the thread', async () => {
    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual(attachments));
  });

  it('requests the versioned internal attachments route', async () => {
    render();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/internal/pnd/conversations/thread-1/attachments',
        REQUEST_OPTIONS
      )
    );
  });

  it('encodes the conversation id, which appears in the path', async () => {
    render({ conversationId: 'thread 1/2' });

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/internal/pnd/conversations/thread%201%2F2/attachments',
        REQUEST_OPTIONS
      )
    );
  });

  it('sends the discovery id as a query param, which the S11 guard requires', async () => {
    render({ correlationId: 'ad 1/2' });

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/internal/pnd/conversations/thread-1/attachments', {
        query: { correlationId: 'ad 1/2' },
        version: API_VERSIONS.internal.v1,
      })
    );
  });

  it('reads nothing without a conversation id', () => {
    render({ conversationId: '' });

    expect(get).not.toHaveBeenCalled();
  });

  it('reads nothing without a discovery id, because the route requires it', () => {
    render({ correlationId: '' });

    expect(get).not.toHaveBeenCalled();
  });

  it('reads nothing while disabled', () => {
    render({ enabled: false });

    expect(get).not.toHaveBeenCalled();
  });

  it('reads a 404 as an empty attachment list rather than a failure', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual({ attachments: [], total: 0 }));
  });

  it('does not report an error for a 404', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    const { result } = render();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('never reads a 500 as an empty attachment list, because it is a real failure', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    const { result } = render();

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current.data).toBeUndefined();
  });

  it('retries a 500, which may be transient', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));

    render();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  });

  it('reads a 404 only once, because an unreadable thread stays unreadable', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('falls back to an empty list when the response carried no body', async () => {
    get.mockResolvedValue(undefined);

    const { result } = render();

    await waitFor(() => expect(result.current.data).toEqual({ attachments: [], total: 0 }));
  });
});
