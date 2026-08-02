/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import {
  PND_CONVERSATIONS_URL,
  buildConversationAttachmentsUrl,
  type GetConversationAttachmentsResponse,
  type ListConversationsResponse,
  type PndConversation,
} from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { LifecycleAttachmentsSection } from '.';

const thread = (overrides: Partial<PndConversation> = {}): PndConversation => ({
  correlationId: 'ad-1',
  createdAt: '2026-08-06T00:00:00.000Z',
  gateId: 'apply_tuning',
  id: 'thread-apply-tuning',
  kind: 'thread',
  title: 'Signed installers exception',
  updatedAt: '2026-08-06T00:00:00.000Z',
  ...overrides,
});

const conversations = (rows: PndConversation[]): ListConversationsResponse => ({
  conversations: rows,
  total: rows.length,
});

const attachments: GetConversationAttachmentsResponse = {
  attachments: [
    {
      content: '## Coordinated credential theft',
      description: 'Attack Discovery',
      id: 'pnd-attack-discovery',
      type: 'text',
      version: 1,
    },
  ],
  total: 1,
};

describe('LifecycleAttachmentsSection', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL ? conversations([thread()]) : attachments
    );
  });

  const renderSection = (correlationId = 'ad-1') =>
    renderWithPndProviders(<LifecycleAttachmentsSection correlationId={correlationId} />, {
      services: { http: { get } },
    });

  it('renders the attachments panel', async () => {
    renderSection();

    expect(await screen.findByTestId('pndLifecycleSection-attachments')).toBeInTheDocument();
  });

  /**
   * It shares the Overview tab with three other sections since decision 1 of the 2026-08-17 sync, so
   * a heading is what tells the analyst where the attachments stop and the next section starts. The
   * tab bar used to do that job.
   */
  it('names itself, because it is no longer the only thing on its panel', async () => {
    renderSection();

    expect(await screen.findByRole('heading', { name: 'Attachments' })).toBeInTheDocument();
  });

  it('renders a section for the discovery thread', async () => {
    renderSection();

    expect(await screen.findByTestId('pndLifecycleThreadAttachments')).toBeInTheDocument();
  });

  it('reads the attachments on that thread', async () => {
    renderSection();

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        buildConversationAttachmentsUrl('thread-apply-tuning'),
        expect.objectContaining({ query: { correlationId: 'ad-1' } })
      )
    );
  });

  it('renders the attachment returned by the route', async () => {
    renderSection();

    expect(await screen.findByTestId('pndLifecycleAttachment')).toHaveAttribute(
      'data-attachment-id',
      'pnd-attack-discovery'
    );
  });

  it('renders a section per thread, because a discovery has one thread per gate', async () => {
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL
        ? conversations([
            thread(),
            thread({ gateId: 'open_investigation', id: 'thread-open-investigation' }),
          ])
        : attachments
    );

    renderSection();

    expect(await screen.findAllByTestId('pndLifecycleThreadAttachments')).toHaveLength(2);
  });

  it('ignores the alert-keyed conversations, which carry no proposal attachments', async () => {
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL
        ? conversations([
            thread({ gateId: undefined, id: 'incident-1', kind: 'incident' }),
            thread(),
          ])
        : attachments
    );

    renderSection();

    expect(await screen.findAllByTestId('pndLifecycleThreadAttachments')).toHaveLength(1);
  });

  it('reads as an ordinary empty state when no proposal has parked a gate yet', async () => {
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL ? conversations([]) : attachments
    );

    renderSection();

    expect(await screen.findByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('does not read attachments when the discovery has no thread', async () => {
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL ? conversations([]) : attachments
    );

    renderSection();

    await screen.findByTestId('pndEmptyState');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('reads as an ordinary empty state for a thread on another discovery', async () => {
    get.mockImplementation(async (url: string) =>
      url === PND_CONVERSATIONS_URL
        ? conversations([thread({ correlationId: 'ad-2' })])
        : attachments
    );

    renderSection();

    expect(await screen.findByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('reads nothing at all for an uncorrelated gate, whose discovery id is blank', () => {
    renderSection('');

    expect(get).not.toHaveBeenCalled();
  });

  it('renders an error state when the conversations read fails', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    renderSection();

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });
});
