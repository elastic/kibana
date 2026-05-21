/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { ConversationPrompt } from './conversation_prompt';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

jest.mock('@kbn/agent-builder-plugin/public', () => {
  const { forwardRef } = require('react');
  return {
    ConversationInputShell: forwardRef(
      ({ children }: { children: React.ReactNode }, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref}>{children}</div>
      )
    ),
  };
});

const mockUseKibana = useKibana as jest.Mock;

const MockEmbeddableConversation = ({ onClose }: { onClose: () => void }) => (
  <div data-test-subj="embeddableConversation">
    <button data-test-subj="embeddableConversationClose" onClick={onClose}>
      Close
    </button>
  </div>
);

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
    jest.useFakeTimers();
    mockUseKibana.mockReturnValue({
      services: { agentBuilder: { EmbeddableConversation: MockEmbeddableConversation } },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not show the overlay on initial mount', () => {
    renderComponent();

    expect(
      screen.queryByTestId('searchGettingStartedChatNewConversationOverlay')
    ).not.toBeInTheDocument();
  });

  it('shows the overlay and mounts EmbeddableConversation when the prompt is activated', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('searchGettingStartedChatPromptSend'));

    expect(
      screen.getByTestId('searchGettingStartedChatNewConversationOverlay')
    ).toBeInTheDocument();
    expect(screen.getByTestId('embeddableConversation')).toBeInTheDocument();
  });

  it('hides the overlay after EmbeddableConversation calls onClose', () => {
    renderComponent();

    // Open and advance to the Open phase so collapseConversation's guard passes
    fireEvent.click(screen.getByTestId('searchGettingStartedChatPromptSend'));
    act(() => {
      jest.runAllTimers();
    });

    fireEvent.click(screen.getByTestId('embeddableConversationClose'));
    act(() => {
      jest.runAllTimers();
    });

    expect(
      screen.queryByTestId('searchGettingStartedChatNewConversationOverlay')
    ).not.toBeInTheDocument();
  });
});
