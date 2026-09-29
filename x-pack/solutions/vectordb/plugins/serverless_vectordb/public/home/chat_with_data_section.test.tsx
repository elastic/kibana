/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { useKibana } from '../hooks/use_kibana';
import { ChatWithYourDataSection } from './chat_with_data_section';

vi.mock('../hooks/use_kibana', () => {
  const mocked = { useKibana: vi.fn() };
  return { ...mocked, default: mocked };
});

const mockUseKibana = useKibana as Mock;

describe('ChatWithYourDataSection', () => {
  const openChat = vi.fn();

  const renderSection = () =>
    render(
      <EuiThemeProvider>
        <ChatWithYourDataSection />
      </EuiThemeProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseKibana.mockReturnValue({ services: { agentBuilder: { openChat } } });
  });

  it('opens the agent with the elasticsearch onboarding skill loaded', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('openElasticAgentButton'));

    expect(openChat).toHaveBeenCalledWith({
      initialMessage: '/elasticsearch-onboarding',
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'vectordb-home',
    });
  });
});
