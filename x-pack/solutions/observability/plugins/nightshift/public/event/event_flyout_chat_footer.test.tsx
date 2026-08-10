/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import type { InvestigationStatus } from '@kbn/investigation-output';
import { EventFlyoutChatFooter } from './event_flyout_chat_footer';

const mockOpenChat = jest.fn();

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      http: { basePath: { prepend: (path: string) => path } },
      agentBuilder: { openChat: mockOpenChat },
    },
  }),
}));

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Web latency spike',
  summary: 'Summary',
  severity: '80-critical',
  confidence: 0.92,
  ...overrides,
});

const renderFooter = ({
  event,
  investigation = {
    workflow_execution_id: 'exec-1',
    started_at: '2026-07-10T12:00:00Z',
  },
  conversationId,
  status = 'loading',
}: {
  event: SignificantEvent;
  investigation?: NonNullable<SignificantEvent['investigations']>[number];
  conversationId?: string;
  status?: InvestigationStatus;
}) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <EventFlyoutChatFooter
          event={event}
          investigation={investigation}
          conversationId={conversationId}
          status={status}
        />
      </EuiProvider>
    </I18nProvider>
  );

describe('EventFlyoutChatFooter', () => {
  beforeEach(() => {
    mockOpenChat.mockClear();
  });

  it('opens a new chat with attachment when the latest investigation has completed', () => {
    renderFooter({
      event: mockEvent(),
      investigation: {
        workflow_execution_id: 'exec-1',
        started_at: '2026-07-10T12:00:00Z',
        completed_at: '2026-07-10T12:05:00Z',
      },
      conversationId: 'conv-123',
      status: 'complete',
    });

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    expect(screen.getByTestId('nightshiftEventFlyoutChatMenuPanel')).toBeInTheDocument();
    expect(screen.getByText('Investigations')).toBeInTheDocument();

    const investigationChatItem = screen.getByTestId(
      'nightshiftEventFlyoutOpenInvestigationChatItem'
    );
    expect(investigationChatItem).toHaveAttribute('data-ebt-action', 'openInChat');
    expect(investigationChatItem).toHaveAttribute('data-ebt-detail', 'existingConversation');
    fireEvent.click(investigationChatItem);
    expect(mockOpenChat).toHaveBeenCalledWith({ conversationId: 'conv-123' });
  });

  it('shows the chat menu when the hook reports complete before completed_at is on the doc', () => {
    renderFooter({
      event: mockEvent(),
      status: 'complete',
    });

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    expect(screen.getByTestId('nightshiftEventFlyoutChatMenuPanel')).toBeInTheDocument();
    const newChatItem = screen.getByTestId('nightshiftEventFlyoutStartNewChatItem');
    expect(newChatItem).toHaveAttribute('data-ebt-action', 'openInChat');
    expect(newChatItem).toHaveAttribute('data-ebt-detail', 'newConversation');
  });

  it('uses a plain button while the latest investigation is still running', () => {
    renderFooter({
      event: mockEvent(),
      status: 'running',
    });

    const chatButton = screen.getByTestId('nightshiftEventFlyoutChatButton');
    expect(chatButton).toHaveAttribute('data-ebt-action', 'openInChat');
    expect(chatButton).toHaveAttribute('data-ebt-detail', 'newConversation');
    fireEvent.click(chatButton);
    expect(screen.queryByTestId('nightshiftEventFlyoutChatMenuPanel')).not.toBeInTheDocument();
    expect(mockOpenChat).toHaveBeenCalledWith(expect.objectContaining({ newConversation: true }));
  });

  it('uses a plain button while a newer investigation is still running on the doc', () => {
    renderFooter({
      event: mockEvent({
        investigations: [
          {
            workflow_execution_id: 'exec-done',
            started_at: '2026-07-10T11:00:00Z',
            completed_at: '2026-07-10T11:05:00Z',
          },
          { workflow_execution_id: 'exec-running', started_at: '2026-07-10T12:00:00Z' },
        ],
      }),
      investigation: {
        workflow_execution_id: 'exec-running',
        started_at: '2026-07-10T12:00:00Z',
      },
      conversationId: 'conv-123',
      status: 'running',
    });

    fireEvent.click(screen.getByTestId('nightshiftEventFlyoutChatButton'));
    expect(screen.queryByTestId('nightshiftEventFlyoutChatMenuPanel')).not.toBeInTheDocument();
  });
});
