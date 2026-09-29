/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { GettingStartedAgentPrompt } from './agent_prompt';
import { useUsageTracker } from '../../contexts/usage_tracker_context';

vi.mock('../../contexts/usage_tracker_context', () => {
  const mocked = {
    useUsageTracker: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseUsageTracker = useUsageTracker as Mock;

const renderComponent = () =>
  render(
    <I18nProvider>
      <EuiThemeProvider>
        <GettingStartedAgentPrompt />
      </EuiThemeProvider>
    </I18nProvider>
  );

describe('GettingStartedAgentPrompt', () => {
  beforeEach(() => {
    mockUseUsageTracker.mockReturnValue({ click: vi.fn(), count: vi.fn(), load: vi.fn() });
  });

  it('does not render the modal on initial mount', () => {
    renderComponent();

    expect(screen.queryByTestId('promptModalCode')).not.toBeInTheDocument();
  });

  it('opens the modal when the Copy prompt button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('chatFirstAgentInstallBtn'));

    expect(screen.getByTestId('promptModalCode')).toBeInTheDocument();
  });

  it('renders the modal with prompt content when opened', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('chatFirstAgentInstallBtn'));

    expect(screen.getByTestId('promptModalCode')).not.toBeEmptyDOMElement();
  });

  it('closes the modal when the Close button is clicked', () => {
    renderComponent();

    fireEvent.click(screen.getByTestId('chatFirstAgentInstallBtn'));
    expect(screen.getByTestId('promptModalCode')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('promptModalCloseBtn'));
    expect(screen.queryByTestId('promptModalCode')).not.toBeInTheDocument();
  });
});
