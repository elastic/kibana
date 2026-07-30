/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConversationTab } from './conversation_tab';
import * as i18n from './translations';

const mockFetch = (impl: (url: string) => Promise<Partial<Response>>) => {
  global.fetch = jest.fn(impl) as unknown as typeof global.fetch;
};

describe('ConversationTab', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not fetch when isActive is false', () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ rounds: [] }) }));
    render(<ConversationTab investigationId="inv-1" isActive={false} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders the empty prompt when the conversation has no rounds', async () => {
    mockFetch(async () => ({ ok: true, status: 200, json: async () => ({ rounds: [] }) }));
    render(<ConversationTab investigationId="inv-1" isActive />);

    await waitFor(() => {
      expect(screen.getByText(i18n.CONVERSATION_EMPTY_TITLE)).toBeInTheDocument();
    });
  });

  it('renders the empty prompt (not an error) on a 404 — no conversation yet is not a failure', async () => {
    mockFetch(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    render(<ConversationTab investigationId="inv-1" isActive />);

    await waitFor(() => {
      expect(screen.getByText(i18n.CONVERSATION_EMPTY_TITLE)).toBeInTheDocument();
    });
    expect(screen.queryByText(i18n.CONVERSATION_ERROR_TITLE)).not.toBeInTheDocument();
  });

  it('renders analyst + worker comment rounds when the conversation has data', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        rounds: [
          {
            input: { message: 'What happened on host-1?' },
            response: { message: 'Endpoint isolated at 14:02 UTC.' },
            started_at: '2026-07-30T14:00:00.000Z',
          },
        ],
      }),
    }));
    render(<ConversationTab investigationId="inv-1" isActive />);

    await waitFor(() => {
      expect(screen.getByText('What happened on host-1?')).toBeInTheDocument();
    });
    expect(screen.getByText('Endpoint isolated at 14:02 UTC.')).toBeInTheDocument();
    expect(screen.getByText(i18n.CONVERSATION_USER_ANALYST)).toBeInTheDocument();
    expect(screen.getByText(i18n.CONVERSATION_USER_WORKER)).toBeInTheDocument();
  });

  it('renders an error callout when the fetch fails with a non-404, non-ok status', async () => {
    mockFetch(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    render(<ConversationTab investigationId="inv-1" isActive />);

    await waitFor(() => {
      expect(screen.getByText(i18n.CONVERSATION_ERROR_TITLE)).toBeInTheDocument();
    });
    expect(screen.getByText('HTTP 500')).toBeInTheDocument();
  });

  it('renders an error callout when fetch itself rejects (network failure)', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('Network down')) as unknown as typeof global.fetch;
    render(<ConversationTab investigationId="inv-1" isActive />);

    await waitFor(() => {
      expect(screen.getByText(i18n.CONVERSATION_ERROR_TITLE)).toBeInTheDocument();
    });
    expect(screen.getByText('Network down')).toBeInTheDocument();
  });
});
