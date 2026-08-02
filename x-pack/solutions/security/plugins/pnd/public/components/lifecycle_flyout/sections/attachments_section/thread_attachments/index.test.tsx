/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { GetConversationAttachmentsResponse, PndConversation } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../../../../test_helpers/create_http_fetch_error';
import { ThreadAttachments } from '.';

const conversation: PndConversation = {
  correlationId: 'ad-1',
  createdAt: '2026-08-06T00:00:00.000Z',
  gateId: 'apply_tuning',
  id: 'thread-apply-tuning',
  kind: 'thread',
  title: 'Signed installers exception',
  updatedAt: '2026-08-06T00:00:00.000Z',
};

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
    {
      content: 'Gate: apply_tuning',
      description: 'Proposed rule change',
      id: 'pnd-proposed-change',
      type: 'text',
      version: 1,
    },
    {
      description: 'Backtest comparison',
      id: 'pnd-backtest-comparison',
      type: 'esql',
      version: 1,
    },
  ],
  total: 3,
};

describe('ThreadAttachments', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(attachments);
  });

  const renderThread = (overrides: Partial<PndConversation> = {}) =>
    renderWithPndProviders(
      <ThreadAttachments correlationId="ad-1" conversation={{ ...conversation, ...overrides }} />,
      { services: { http: { get } } }
    );

  it('renders one row per attachment', async () => {
    renderThread();

    expect(await screen.findAllByTestId('pndLifecycleAttachment')).toHaveLength(3);
  });

  it('keys each row on the PND-owned attachment id', async () => {
    renderThread();

    const rows = await screen.findAllByTestId('pndLifecycleAttachment');

    expect(rows.map((row) => row.getAttribute('data-attachment-id'))).toEqual([
      'pnd-attack-discovery',
      'pnd-proposed-change',
      'pnd-backtest-comparison',
    ]);
  });

  it('renders the attachment description', async () => {
    renderThread();

    expect(await screen.findByText('Attack Discovery')).toBeInTheDocument();
  });

  it('renders the text content of an attachment that has some', async () => {
    renderThread();

    expect(await screen.findAllByTestId('pndLifecycleAttachmentContent')).toHaveLength(2);
  });

  it('says so rather than dropping an attachment whose type has no inline text', async () => {
    renderThread();

    expect(await screen.findByTestId('pndLifecycleAttachmentNoContent')).toBeInTheDocument();
  });

  it('names the gate the thread is paired with, which is all that tells two threads apart', async () => {
    renderThread();

    expect(await screen.findByTestId('pndLifecycleThreadGate')).toHaveTextContent(
      'Apply a rule tuning'
    );
  });

  it('renders the agent-written thread title', async () => {
    renderThread();

    expect(await screen.findByTestId('pndLifecycleThreadTitle')).toHaveTextContent(
      'Signed installers exception'
    );
  });

  it('publishes the conversation id, so a thread can be joined from the DOM', async () => {
    renderThread();

    expect(await screen.findByTestId('pndLifecycleThreadAttachments')).toHaveAttribute(
      'data-conversation-id',
      'thread-apply-tuning'
    );
  });

  it('falls back to the attachment id when the description is absent', async () => {
    get.mockResolvedValue({
      attachments: [{ id: 'pnd-attack-discovery', type: 'text' }],
      total: 1,
    });

    renderThread();

    expect(await screen.findByText('pnd-attack-discovery')).toBeInTheDocument();
  });

  it('reads a thread with no attachments as normal, not as a failure', async () => {
    get.mockResolvedValue({ attachments: [], total: 0 });

    renderThread();

    expect(await screen.findByTestId('pndLifecycleThreadAttachmentsEmpty')).toBeInTheDocument();
  });

  it('reads a 404 as an empty thread, because the route refuses with one on purpose', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 404 }));

    renderThread();

    expect(await screen.findByTestId('pndLifecycleThreadAttachmentsEmpty')).toBeInTheDocument();
  });

  it('renders an error state when the read fails with something other than a 404', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    renderThread();

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('calls out a list the route truncated', async () => {
    get.mockResolvedValue({ attachments: attachments.attachments, total: 120 });

    renderThread();

    expect(await screen.findByTestId('pndLifecycleAttachmentsTruncated')).toBeInTheDocument();
  });

  it('does not call out a list that was not truncated', async () => {
    renderThread();

    await screen.findAllByTestId('pndLifecycleAttachment');

    expect(screen.queryByTestId('pndLifecycleAttachmentsTruncated')).not.toBeInTheDocument();
  });
});
