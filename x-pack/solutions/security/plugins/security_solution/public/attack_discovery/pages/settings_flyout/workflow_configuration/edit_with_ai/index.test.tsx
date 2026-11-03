/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActiveConversation } from '@kbn/agent-builder-browser/events';
import type { Conversation } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { TestProviders } from '../../../../../common/mock';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useKibana } from '../../../../../common/lib/kibana';
import { EditWithAi } from '.';
import * as i18n from './translations';

jest.mock('../../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

const mockOpenChat = jest.fn();
const mockUseAgentBuilderAvailability = jest.mocked(useAgentBuilderAvailability);
const mockUseKibana = useKibana as jest.Mock;

let mockActiveConversation$: BehaviorSubject<ActiveConversation | null>;

const defaultProps = {
  esqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
  onEsqlQueryChange: jest.fn(),
};

const createActiveConversation = (id: string, query: string): ActiveConversation => ({
  conversation: {
    attachments: [
      {
        active: true,
        current_version: 1,
        hidden: false,
        id: 'esql-1',
        type: AttachmentType.esql,
        versions: [
          {
            content_hash: 'hash',
            created_at: new Date().toISOString(),
            data: { description: 'ES|QL', query },
            estimated_tokens: 10,
            version: 1,
          },
        ],
      },
    ],
  } as Conversation,
  id,
});

describe('EditWithAi', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockActiveConversation$ = new BehaviorSubject<ActiveConversation | null>(null);

    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
    });

    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          events: { ui: { activeConversation$: mockActiveConversation$.asObservable() } },
          openChat: mockOpenChat,
        },
        telemetry: { reportEvent: jest.fn() },
      },
    });
  });

  it('renders the Edit with AI button', () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('editWithAiButton')).toBeInTheDocument();
  });

  it('renders the button with correct text', () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('editWithAiButton')).toHaveTextContent(i18n.EDIT_WITH_AI);
  });

  it('renders the button as enabled when Agent Builder is available', () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('editWithAiButton')).not.toBeDisabled();
  });

  it('renders the button as disabled when Agent Builder is unavailable', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: false,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: false,
      isAgentChatExperienceEnabled: false,
    });

    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('editWithAiButton')).toBeDisabled();
  });

  it('wraps the button in a tooltip when Agent Builder is unavailable', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: false,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: false,
      isAgentChatExperienceEnabled: false,
    });

    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('editWithAiTooltip')).toBeInTheDocument();
  });

  it('does not wrap the button in a tooltip when Agent Builder is available', () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    expect(screen.queryByTestId('editWithAiTooltip')).not.toBeInTheDocument();
  });

  it('opens the Agent Builder chat when clicked', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).toHaveBeenCalledTimes(1);
  });

  it('does not pass an agentId override to openChat (lets agent builder use its default)', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.not.objectContaining({
        agentId: expect.anything(),
      })
    );
  });

  it('passes newConversation=true to openChat', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
      })
    );
  });

  it('passes autoSendInitialMessage=false to openChat', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSendInitialMessage: false,
      })
    );
  });

  it('passes the security session tag to openChat', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionTag: 'security',
      })
    );
  });

  it('passes a plain initialMessage that does NOT contain the raw ES|QL query', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];

    expect(callArgs.initialMessage).toBe(i18n.INITIAL_MESSAGE);
    expect(callArgs.initialMessage).not.toContain(defaultProps.esqlQuery);
  });

  it('passes an initialMessage that ends with a trailing space so the user starts a new sentence', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];

    expect(callArgs.initialMessage).toMatch(/ $/);
  });

  it('passes an esql attachment containing the current query', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];

    expect(callArgs.attachments).toEqual([
      expect.objectContaining({
        data: { description: i18n.ESQL_ATTACHMENT_DESCRIPTION, query: defaultProps.esqlQuery },
        type: AttachmentType.esql,
      }),
    ]);
  });

  it('passes browserApiTools with the update_esql_query tool', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];

    expect(callArgs.browserApiTools).toHaveLength(1);
    expect(callArgs.browserApiTools[0].id).toBe('update_esql_query');
  });

  it('instructs the LLM to ALWAYS call the tool when generating a new query', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];
    const toolDescription = callArgs.browserApiTools[0].description;

    expect(toolDescription).toMatch(/ALWAYS/i);
  });

  it('does NOT pass onRoundComplete to openChat', async () => {
    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];

    expect(callArgs).not.toHaveProperty('onRoundComplete');
  });

  it('calls onEsqlQueryChange when the update_esql_query tool handler is invoked', async () => {
    const onEsqlQueryChange = jest.fn();

    render(
      <TestProviders>
        <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const callArgs = mockOpenChat.mock.calls[0][0];
    const updateTool = callArgs.browserApiTools[0];

    updateTool.handler({
      query: 'FROM .alerts-security.alerts-default | WHERE event.severity > 50 | LIMIT 200',
    });

    expect(onEsqlQueryChange).toHaveBeenCalledWith(
      'FROM .alerts-security.alerts-default | WHERE event.severity > 50 | LIMIT 200'
    );
  });

  it('does not call openChat when agentBuilder is unavailable', async () => {
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: undefined,
        telemetry: { reportEvent: jest.fn() },
      },
    });

    mockUseAgentBuilderAvailability.mockReturnValue({
      hasAgentBuilderPrivilege: true,
      hasValidAgentBuilderLicense: true,
      isAgentBuilderEnabled: true,
      isAgentChatExperienceEnabled: true,
    });

    render(
      <TestProviders>
        <EditWithAi {...defaultProps} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    expect(mockOpenChat).not.toHaveBeenCalled();
  });

  it('calls the LATEST onEsqlQueryChange when the tool handler is invoked after a re-render', async () => {
    const firstOnEsqlQueryChange = jest.fn();
    const secondOnEsqlQueryChange = jest.fn();

    const { rerender } = render(
      <TestProviders>
        <EditWithAi {...defaultProps} onEsqlQueryChange={firstOnEsqlQueryChange} />
      </TestProviders>
    );

    await userEvent.click(screen.getByTestId('editWithAiButton'));

    const capturedTool = mockOpenChat.mock.calls[0][0].browserApiTools[0];

    capturedTool.handler({ query: 'FROM .alerts | LIMIT 200' });

    expect(firstOnEsqlQueryChange).toHaveBeenCalledWith('FROM .alerts | LIMIT 200');

    rerender(
      <TestProviders>
        <EditWithAi
          {...defaultProps}
          esqlQuery="FROM .alerts | LIMIT 200"
          onEsqlQueryChange={secondOnEsqlQueryChange}
        />
      </TestProviders>
    );

    capturedTool.handler({ query: 'FROM .alerts | LIMIT 300' });

    expect(secondOnEsqlQueryChange).toHaveBeenCalledWith('FROM .alerts | LIMIT 300');
  });

  describe('auto-apply from the ES|QL attachment', () => {
    it('applies the attachment query when it differs from the query that was sent', async () => {
      const onEsqlQueryChange = jest.fn();

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('editWithAiButton'));

      act(() => {
        mockActiveConversation$.next({ id: undefined });
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 200')
        );
      });

      expect(onEsqlQueryChange).toHaveBeenCalledWith('FROM .alerts | LIMIT 200');
    });

    it('ignores the active conversation until Edit with AI is clicked', () => {
      const onEsqlQueryChange = jest.fn();

      mockActiveConversation$.next(
        createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 200')
      );

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 300')
        );
      });

      expect(onEsqlQueryChange).not.toHaveBeenCalled();
    });

    it('ignores conversations other than the one opened by Edit with AI', async () => {
      const onEsqlQueryChange = jest.fn();

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('editWithAiButton'));

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', defaultProps.esqlQuery)
        );
        mockActiveConversation$.next(
          createActiveConversation('conversation-2', 'FROM .alerts | LIMIT 200')
        );
      });

      expect(onEsqlQueryChange).not.toHaveBeenCalled();
    });

    it('does not put the sent query back after the tool updated the query', async () => {
      const onEsqlQueryChange = jest.fn();

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('editWithAiButton'));

      const callArgs = mockOpenChat.mock.calls[0][0];
      const updateTool = callArgs.browserApiTools[0];

      updateTool.handler({ query: 'FROM .alerts | WHERE status = "open" | LIMIT 200' });

      onEsqlQueryChange.mockClear();

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', defaultProps.esqlQuery)
        );
      });

      expect(onEsqlQueryChange).not.toHaveBeenCalled();
    });

    it('applies a later attachment change after the tool updated the query', async () => {
      const onEsqlQueryChange = jest.fn();

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('editWithAiButton'));

      const callArgs = mockOpenChat.mock.calls[0][0];
      const updateTool = callArgs.browserApiTools[0];

      updateTool.handler({ query: 'FROM .alerts | WHERE status = "open" | LIMIT 200' });

      onEsqlQueryChange.mockClear();

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', defaultProps.esqlQuery)
        );
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 300')
        );
      });

      expect(onEsqlQueryChange).toHaveBeenCalledTimes(1);
      expect(onEsqlQueryChange).toHaveBeenCalledWith('FROM .alerts | LIMIT 300');
    });

    it('does not re-apply the same attachment query when the conversation is published again', async () => {
      const onEsqlQueryChange = jest.fn();

      render(
        <TestProviders>
          <EditWithAi {...defaultProps} onEsqlQueryChange={onEsqlQueryChange} />
        </TestProviders>
      );

      await userEvent.click(screen.getByTestId('editWithAiButton'));

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 200')
        );
      });

      expect(onEsqlQueryChange).toHaveBeenCalledTimes(1);

      onEsqlQueryChange.mockClear();

      act(() => {
        mockActiveConversation$.next(
          createActiveConversation('conversation-1', 'FROM .alerts | LIMIT 200')
        );
      });

      expect(onEsqlQueryChange).not.toHaveBeenCalled();
    });
  });
});
