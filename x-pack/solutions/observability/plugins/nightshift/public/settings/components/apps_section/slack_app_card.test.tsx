/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { useRelayAppConnection } from './use_relay_app_connection';
import { SlackAppCard } from '.';

jest.mock('./use_relay_app_connection');
jest.mock('./slack_connection_bindings', () => ({ SlackConnectionBindings: () => null }));

const mockUseRelayAppConnection = useRelayAppConnection as jest.MockedFunction<
  typeof useRelayAppConnection
>;

const withConnection = (overrides: Partial<ReturnType<typeof useRelayAppConnection>>) =>
  mockUseRelayAppConnection.mockReturnValue({
    isLoading: false,
    hasStatusRequestError: false,
    available: true,
    status: 'not_connected',
    error: undefined,
    isMutating: false,
    retryStatusRequest: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  });

const renderCard = (props: React.ComponentProps<typeof SlackAppCard>) =>
  render(
    <I18nProvider>
      <SlackAppCard {...props} />
    </I18nProvider>
  );

describe('SlackAppCard', () => {
  it('offers to connect the workspace when the Slack App is available', () => {
    withConnection({});
    renderCard({ canEdit: true, description: 'Custom description' });

    expect(screen.getByText('Custom description')).toBeInTheDocument();
    expect(screen.getByTestId('streamsSlackAppConnectButton')).toBeEnabled();
  });

  it('renders nothing when the Slack App is unavailable', () => {
    withConnection({ available: false });
    renderCard({ canEdit: true });

    expect(screen.queryByTestId('streamsSlackAppCard')).not.toBeInTheDocument();
  });

  it('shows a note instead of the connect button when asked to render while unavailable', () => {
    withConnection({ available: false });
    renderCard({ canEdit: true, showWhenUnavailable: true });

    expect(screen.getByTestId('streamsSlackAppUnavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppConnectButton')).not.toBeInTheDocument();
  });

  it('shows the note when the status request failed', () => {
    withConnection({ hasStatusRequestError: true });
    renderCard({ canEdit: true, showWhenUnavailable: true });

    expect(screen.getByTestId('streamsSlackAppUnavailable')).toBeInTheDocument();
  });
});
