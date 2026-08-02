/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithPndProviders } from '../../../components/test_utils/render_with_pnd_providers';
import { mockConversations, mockThreadConversations } from '../mock/conversations';
import { ChatConversationRow } from './chat_conversation_row';

const conversation = mockConversations[0];

const threadFor = (gateId: string) => {
  const thread = mockThreadConversations.find((candidate) => candidate.gateId === gateId);

  if (thread == null) {
    throw new Error(`no thread fixture for gate ${gateId}`);
  }

  return thread;
};

const createServices = () => ({
  application: {
    getUrlForApp: jest.fn(
      (appId: string, options?: { path?: string }) => `/app/${appId}${options?.path ?? ''}`
    ),
    navigateToApp: jest.fn(),
  },
});

describe('ChatConversationRow', () => {
  it('renders the shared conversation row', () => {
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, {
      services: createServices(),
    });

    expect(screen.getByTestId('pndConversationRow')).toBeInTheDocument();
  });

  it('links the title at the legacy Agent Builder conversation route, which resolves the agent', () => {
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, {
      services: createServices(),
    });

    expect(screen.getByTestId('pndConversationRowTitle')).toHaveAttribute(
      'href',
      `/app/agent_builder/conversations/${conversation.id}`
    );
  });

  it('opens the conversation in Agent Builder when the title is clicked', () => {
    const services = createServices();
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, { services });

    fireEvent.click(screen.getByTestId('pndConversationRowTitle'));

    expect(services.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
      openInNewTab: true,
      path: `/conversations/${conversation.id}`,
    });
  });

  it('opens the hand-off in a new tab, so PND stays on screen behind it', () => {
    const services = createServices();
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, { services });

    fireEvent.click(screen.getByTestId('pndConversationRowTitle'));

    expect(services.application.navigateToApp.mock.calls[0][1]).toMatchObject({
      openInNewTab: true,
    });
  });

  it('opens the four-phase lifecycle over the list rather than navigating away', () => {
    const { history } = renderWithPndProviders(
      <ChatConversationRow conversation={conversation} />,
      {
        route: '/chats',
        services: createServices(),
      }
    );

    fireEvent.click(screen.getByTestId('pndConversationRowViewLifecycle'));

    expect(history.location).toMatchObject({
      pathname: '/chats',
      search: `?lifecycle=${conversation.correlationId}`,
    });
  });

  it('renders no lifecycle action for a conversation with no attack discovery to open', () => {
    renderWithPndProviders(
      <ChatConversationRow conversation={{ ...conversation, correlationId: '' }} />,
      { services: createServices() }
    );

    expect(screen.queryByTestId('pndConversationRowViewLifecycle')).not.toBeInTheDocument();
  });

  describe('a thread row', () => {
    const thread = threadFor('apply_tuning');

    it('says which gate the thread is paired with, since its title is agent-written', () => {
      renderWithPndProviders(<ChatConversationRow conversation={thread} />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndConversationRowGate')).toHaveTextContent('Apply a rule tuning');
    });

    it('badges the row as a thread', () => {
      renderWithPndProviders(<ChatConversationRow conversation={thread} />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndConversationKindBadge')).toHaveAttribute('data-kind', 'thread');
    });

    it('deep-links out to Agent Builder at the gate-derived conversation id', () => {
      renderWithPndProviders(<ChatConversationRow conversation={thread} />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndConversationRowTitle')).toHaveAttribute(
        'href',
        `/app/agent_builder/conversations/${thread.id}`
      );
    });

    it('opens the thread in Agent Builder rather than embedding it', () => {
      const services = createServices();
      renderWithPndProviders(<ChatConversationRow conversation={thread} />, { services });

      fireEvent.click(screen.getByTestId('pndConversationRowTitle'));

      expect(services.application.navigateToApp).toHaveBeenCalledWith('agent_builder', {
        openInNewTab: true,
        path: `/conversations/${thread.id}`,
      });
    });

    it('opens the lifecycle of the attack discovery the thread hangs off', () => {
      const { history } = renderWithPndProviders(<ChatConversationRow conversation={thread} />, {
        route: '/chats',
        services: createServices(),
      });

      fireEvent.click(screen.getByTestId('pndConversationRowViewLifecycle'));

      expect(history.location.search).toEqual(`?lifecycle=${thread.correlationId}`);
    });
  });

  it('renders no gate line for an alert-keyed conversation, which has no gate', () => {
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, {
      services: createServices(),
    });

    expect(screen.queryByTestId('pndConversationRowGate')).not.toBeInTheDocument();
  });

  describe('the row the detail panel is open on', () => {
    it('marks the selected row as the current one', () => {
      renderWithPndProviders(<ChatConversationRow conversation={conversation} isSelected />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndChatsConversationRow')).toHaveAttribute('aria-current', 'true');
    });

    it('leaves an unselected row unmarked', () => {
      renderWithPndProviders(<ChatConversationRow conversation={conversation} />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndChatsConversationRow')).not.toHaveAttribute('aria-current');
    });

    it('renders the same row whether or not it is selected', () => {
      renderWithPndProviders(<ChatConversationRow conversation={conversation} isSelected />, {
        services: createServices(),
      });

      expect(screen.getByTestId('pndConversationRowTitle')).toHaveTextContent(conversation.title);
    });
  });

  it('still renders the title when the application service is unavailable', () => {
    renderWithPndProviders(<ChatConversationRow conversation={conversation} />, { services: {} });

    expect(screen.getByTestId('pndConversationRowTitle')).toHaveTextContent(conversation.title);
  });
});
