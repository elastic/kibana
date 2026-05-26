/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { ConversationPrompt } from './conversation_prompt';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockNavigateToApp = jest.fn();
const mockUseKibana = useKibana as jest.Mock;

const renderComponent = () =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <ConversationPrompt />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('ConversationPrompt', () => {
  beforeEach(() => {
    mockNavigateToApp.mockClear();
    mockUseKibana.mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
  });

  it('renders the textarea and send button', () => {
    renderComponent();
    expect(screen.getByTestId('searchGettingStartedChatPromptInput')).toBeInTheDocument();
    expect(screen.getByTestId('searchGettingStartedChatPromptSend')).toBeInTheDocument();
  });

  it('send button is disabled when the input is empty', () => {
    renderComponent();
    expect(screen.getByTestId('searchGettingStartedChatPromptSend')).toBeDisabled();
  });

  it('send button is enabled after typing a message', () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('searchGettingStartedChatPromptInput'), {
      target: { value: 'Hello' },
    });
    expect(screen.getByTestId('searchGettingStartedChatPromptSend')).not.toBeDisabled();
  });

  it('navigates to agent builder with the message when send is clicked', () => {
    renderComponent();
    fireEvent.change(screen.getByTestId('searchGettingStartedChatPromptInput'), {
      target: { value: 'Help me get started' },
    });
    fireEvent.click(screen.getByTestId('searchGettingStartedChatPromptSend'));
    expect(mockNavigateToApp).toHaveBeenCalledWith(
      'agent_builder',
      expect.objectContaining({
        state: expect.objectContaining({ initialMessage: 'Help me get started' }),
      })
    );
  });

  it('navigates to agent builder when Enter is pressed', () => {
    renderComponent();
    const input = screen.getByTestId('searchGettingStartedChatPromptInput');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigateToApp).toHaveBeenCalled();
  });

  it('does not navigate when Shift+Enter is pressed', () => {
    renderComponent();
    const input = screen.getByTestId('searchGettingStartedChatPromptInput');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });

  it('does not navigate when the message is blank', () => {
    renderComponent();
    fireEvent.keyDown(screen.getByTestId('searchGettingStartedChatPromptInput'), { key: 'Enter' });
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });
});
