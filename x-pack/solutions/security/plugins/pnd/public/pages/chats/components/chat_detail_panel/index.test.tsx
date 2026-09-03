/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { GetConversationAttachmentsResponse, PndConversation } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { mockConversations, mockThreadConversations } from '../../mock/conversations';
import { ChatDetailPanel } from '.';

jest.mock('../../../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const thread = mockThreadConversations[0];
const investigation = mockConversations[0];

const attachmentsResponse: GetConversationAttachmentsResponse = {
  attachments: [
    {
      content: '## Coordinated credential theft',
      description: 'Attack discovery',
      id: 'pnd-attack-discovery',
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
  total: 2,
};

describe('ChatDetailPanel', () => {
  const get = jest.fn();
  const navigateToApp = jest.fn();
  const onClose = jest.fn();

  const services = {
    application: { navigateToApp },
    http: { get },
  };

  const renderPanel = (conversation: PndConversation = thread) =>
    renderWithPndProviders(<ChatDetailPanel conversation={conversation} onClose={onClose} />, {
      route: `/chats?conversationId=${conversation.id}`,
      services,
    });

  const waitForAttachments = async () => {
    await waitFor(() =>
      expect(screen.queryAllByTestId('pndChatsDetailAttachment').length).toBeGreaterThan(0)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(attachmentsResponse);
  });

  it('renders the panel', () => {
    renderPanel();

    expect(screen.getByTestId('pndChatsDetailPanel')).toBeInTheDocument();
  });

  it('titles the panel with the thread title', () => {
    renderPanel();

    expect(screen.getByTestId('pndChatsDetailPanelTitle')).toHaveTextContent(thread.title);
  });

  it('names an untitled conversation rather than rendering an empty heading', () => {
    renderPanel({ ...thread, title: '   ' });

    expect(screen.getByTestId('pndChatsDetailPanelTitle')).toHaveTextContent('Untitled');
  });

  it('names an untitled conversation on the Agent Builder button too', () => {
    renderPanel({ ...thread, title: '   ' });

    expect(screen.getByTestId('pndChatsDetailPanelOpenInAgentBuilder')).toHaveAttribute(
      'aria-label',
      'Open Untitled in Agent Builder'
    );
  });

  /**
   * The type tag came off the chat **case** header on 2026-08-18 — *"flyout and chat case headers
   * drop the same type tags (Sub-investigation, Investigation, Incident)"*. It supersedes the
   * 2026-08-12 rule that badged a child `Sub-investigation` *"everywhere the child itself is
   * shown"*, which is what put a badge here in the first place.
   *
   * The badge component is not retired with it: the conversations list beside this panel still
   * renders one per row, because that list is what the kind filter pills filter.
   */
  it('renders no conversation-kind tag in the header', () => {
    renderPanel();

    expect(screen.queryByTestId('pndConversationKindBadge')).not.toBeInTheDocument();
  });

  it('renders none of the three container type labels as text either', () => {
    renderPanel();

    expect(
      ['Investigation', 'Sub-investigation', 'Incident'].some(
        (label) => screen.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('names the gate the thread is paired with', () => {
    renderPanel();

    expect(screen.getByTestId('pndChatsDetailPanelGate')).toHaveTextContent('Apply a rule tuning');
  });

  it('renders no gate line for an alert-keyed conversation, which has no gate', () => {
    renderPanel(investigation);

    expect(screen.queryByTestId('pndChatsDetailPanelGate')).not.toBeInTheDocument();
  });

  it('reads the attachments of the conversation it was opened on', async () => {
    renderPanel();
    await waitForAttachments();

    expect(get).toHaveBeenCalledWith(
      `/internal/pnd/conversations/${thread.id}/attachments`,
      expect.objectContaining({ query: { correlationId: thread.correlationId } })
    );
  });

  it('renders one row per attachment', async () => {
    renderPanel();
    await waitForAttachments();

    expect(screen.getAllByTestId('pndChatsDetailAttachment')).toHaveLength(
      attachmentsResponse.attachments.length
    );
  });

  it('counts the attachments the conversation carries', async () => {
    renderPanel();
    await waitForAttachments();

    expect(screen.getByTestId('pndChatsDetailAttachmentsCount')).toHaveTextContent('2 attachments');
  });

  it('says the conversation carries nothing rather than rendering an empty list', async () => {
    get.mockResolvedValue({ attachments: [], total: 0 });
    renderPanel();

    expect(await screen.findByTestId('pndChatsDetailAttachmentsEmpty')).toBeInTheDocument();
  });

  it('surfaces a failed attachments read without taking the rest of the panel down', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 500 }));
    renderPanel();
    await screen.findByTestId('pndErrorState');

    expect(screen.getByTestId('pndChatsDetailPanelTitle')).toBeInTheDocument();
  });

  it('reads no attachments for a conversation that names no attack discovery', () => {
    renderPanel({ ...thread, correlationId: '' });

    expect(get).not.toHaveBeenCalled();
  });

  it('says why there are no attachments for a conversation that names no attack discovery', () => {
    renderPanel({ ...thread, correlationId: '' });

    expect(screen.getByTestId('pndChatsDetailAttachmentsUnavailable')).toBeInTheDocument();
  });

  it('opens the conversation in Agent Builder, preserving the existing deep link', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('pndChatsDetailPanelOpenInAgentBuilder'));

    expect(navigateToApp).toHaveBeenCalledWith('agent_builder', {
      openInNewTab: true,
      path: `/conversations/${thread.id}`,
    });
  });

  it('names the conversation the Agent Builder button opens', () => {
    renderPanel();

    expect(screen.getByTestId('pndChatsDetailPanelOpenInAgentBuilder')).toHaveAttribute(
      'aria-label',
      `Open ${thread.title} in Agent Builder`
    );
  });

  it('closes the panel', () => {
    renderPanel();

    fireEvent.click(screen.getByTestId('pndChatsDetailPanelClose'));

    expect(onClose).toHaveBeenCalled();
  });
});
