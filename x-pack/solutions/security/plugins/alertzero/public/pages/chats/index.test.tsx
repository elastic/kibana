/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { ChatsPage } from '.';

const EmbeddableConversation = jest.fn(
  ({ conversationId, sessionTag }: { conversationId?: string; sessionTag?: string }) => (
    <div
      data-conversation-id={conversationId ?? ''}
      data-session-tag={sessionTag ?? ''}
      data-test-subj="embeddableConversation"
    />
  )
);

const renderPage = (initialEntry: string, agentBuilder?: { EmbeddableConversation: unknown }) => {
  const history = createMemoryHistory({ initialEntries: [initialEntry] });

  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            agentBuilder: agentBuilder ?? { EmbeddableConversation },
            chrome: { docTitle: { change: jest.fn(), reset: jest.fn() } },
          }}
        >
          <Router history={history}>
            <ChatsPage />
          </Router>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('ChatsPage', () => {
  beforeEach(() => {
    EmbeddableConversation.mockClear();
  });

  it('restores the investigation conversation named in chatId', () => {
    renderPage('/chats?chatId=a7a7cd16-b7eb-4a8d-9fb8-ccae0166ad9d');

    expect(screen.getByTestId('embeddableConversation')).toHaveAttribute(
      'data-conversation-id',
      'a7a7cd16-b7eb-4a8d-9fb8-ccae0166ad9d'
    );
  });

  it('tags the restored session with the same conversation id', () => {
    renderPage('/chats?chatId=a7a7cd16-b7eb-4a8d-9fb8-ccae0166ad9d');

    expect(screen.getByTestId('embeddableConversation')).toHaveAttribute(
      'data-session-tag',
      'a7a7cd16-b7eb-4a8d-9fb8-ccae0166ad9d'
    );
  });

  it('does not pin a conversation when chatId is absent', () => {
    renderPage('/chats');

    expect(screen.getByTestId('embeddableConversation')).toHaveAttribute(
      'data-conversation-id',
      ''
    );
  });

  it('uses the default agent', () => {
    renderPage('/chats?chatId=conversation-1');

    expect(EmbeddableConversation).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: agentBuilderDefaultAgentId }),
      expect.anything()
    );
  });
});
