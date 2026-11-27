/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';
import { useQueryClient } from '@kbn/react-query';
import { coreMock } from '@kbn/core/public/mocks';
import { observabilityAIAssistantPluginMock } from '@kbn/observability-ai-assistant-plugin/public/mock';
import type { Message } from '@kbn/observability-ai-assistant-plugin/public';
import type { AIAssistantPluginStartDependencies } from '@kbn/ai-assistant/src/types';
import { NavControlWithProvider } from '.';

jest.mock('@kbn/ai-assistant', () => ({
  ...jest.requireActual('@kbn/ai-assistant'),
  ChatFlyout: () => {
    useQueryClient();
    return <div data-test-subj="mockChatFlyout" />;
  },
}));

describe('NavControlWithProvider', () => {
  it('renders the chat flyout inside a query client provider', async () => {
    const predefinedConversation$ = new Subject<{ messages: Message[]; title?: string }>();
    const observabilityAIAssistant = observabilityAIAssistantPluginMock.createStartContract();
    observabilityAIAssistant.service.conversations = {
      predefinedConversation$,
      openNewConversation: ({ messages }) => predefinedConversation$.next({ messages }),
    };

    render(
      <NavControlWithProvider
        coreStart={coreMock.createStart()}
        pluginsStart={{ observabilityAIAssistant } as unknown as AIAssistantPluginStartDependencies}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTestId('AiAssistantAppNavControlButton'));
    });

    await waitFor(() => expect(screen.getByTestId('mockChatFlyout')).toBeInTheDocument());
  });
});
