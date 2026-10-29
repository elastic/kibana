/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';

// Mock the hooks that depend on Kibana context — keep the component under test
// isolated so we can drive its UI purely through controlled bindings.
jest.mock('./use_relay_app_bindings', () => ({
  ...jest.requireActual('./use_relay_app_bindings'),
  useRelayAppBindings: jest.fn(),
  useBindChannel: jest.fn(),
  useUnbindChannel: jest.fn(),
}));
const mockDisconnectWorkspace = jest.fn().mockResolvedValue(undefined);
const mockConnectWorkspace = jest.fn().mockResolvedValue(undefined);
const mockConfirmWorkspace = jest.fn().mockResolvedValue(undefined);
const mockRetryStatusRequest = jest.fn();
const mockUseRelayAppConnection = jest.fn();
jest.mock('./use_relay_app_connection', () => ({
  useRelayAppConnection: () => mockUseRelayAppConnection(),
  RELAY_APP_CONNECTION_STATUS_QUERY_KEY: ['relayAppConnectionStatus'],
}));

const mockUseRelayAppBindings = useRelayAppBindings as jest.MockedFunction<
  typeof useRelayAppBindings
>;
const mockUseBindChannel = useBindChannel as jest.MockedFunction<typeof useBindChannel>;
const mockUseUnbindChannel = useUnbindChannel as jest.MockedFunction<typeof useUnbindChannel>;

// AppsSection pulls the whole card + bindings together.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppsSection } = require('.');

const bindChannel = jest.fn().mockResolvedValue(undefined);
const unbindChannel = jest.fn().mockResolvedValue(undefined);

function makeBindings(bindings: SlackChannelBinding[], nextCursor?: string) {
  mockUseRelayAppBindings.mockReturnValue({
    bindings,
    isLoading: false,
    isFetching: false,
    nextCursor,
  });
  mockUseBindChannel.mockReturnValue({
    bind: bindChannel,
    isLoading: false,
    clearFailure: jest.fn(),
  });
  mockUseUnbindChannel.mockReturnValue({ unbind: unbindChannel, isLoading: false });
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AppsSection canEdit />
      </QueryClientProvider>
    </I18nProvider>
  );
}

// The channel bindings are hidden by default; reveal them via the toggle button.
const revealChannels = () =>
  fireEvent.click(screen.getByTestId('streamsSlackAppToggleChannelsButton'));

describe('AppsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRelayAppConnection.mockReturnValue({
      isLoading: false,
      hasStatusRequestError: false,
      available: true,
      status: 'connected',
      error: undefined,
      isMutating: false,
      retryStatusRequest: mockRetryStatusRequest,
      connect: mockConnectWorkspace,
      confirm: mockConfirmWorkspace,
      disconnect: mockDisconnectWorkspace,
    });
  });

  describe('when a workspace is awaiting confirmation', () => {
    const mockPendingConfirmation = (workspace: {
      tenantKey: string;
      name?: string;
      url?: string;
    }) =>
      mockUseRelayAppConnection.mockReturnValue({
        isLoading: false,
        hasStatusRequestError: false,
        available: true,
        status: 'pending_confirmation',
        workspace,
        isMutating: false,
        retryStatusRequest: mockRetryStatusRequest,
        connect: mockConnectWorkspace,
        confirm: mockConfirmWorkspace,
        disconnect: mockDisconnectWorkspace,
      });

    it('confirms the workspace that was shown', () => {
      mockPendingConfirmation({ tenantKey: 'T0123ABC', url: 'https://acme.slack.com/' });
      setup();

      fireEvent.click(screen.getByTestId('streamsSlackAppConfirmWorkspaceButton'));
      expect(mockConfirmWorkspace).toHaveBeenCalledWith('T0123ABC');
    });

    it('rejects the workspace by disconnecting it', () => {
      mockPendingConfirmation({ tenantKey: 'T0123ABC', url: 'https://acme.slack.com/' });
      setup();

      fireEvent.click(screen.getByTestId('streamsSlackAppRejectWorkspaceButton'));
      expect(mockDisconnectWorkspace).toHaveBeenCalledWith('T0123ABC');
      expect(mockConfirmWorkspace).not.toHaveBeenCalled();
    });
  });

  it('distinguishes a status request failure from app unavailability', () => {
    mockUseRelayAppConnection.mockReturnValue({
      isLoading: false,
      hasStatusRequestError: true,
      available: false,
      status: 'not_connected',
      error: undefined,
      isMutating: false,
      retryStatusRequest: mockRetryStatusRequest,
      connect: mockConnectWorkspace,
      disconnect: mockDisconnectWorkspace,
    });

    setup();

    expect(screen.getByTestId('nightshiftAppsStatusError')).toHaveTextContent(
      'Unable to check app availability'
    );
    expect(screen.queryByTestId('nightshiftAppsUnavailable')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftAppsStatusRetryButton'));
    expect(mockRetryStatusRequest).toHaveBeenCalledTimes(1);
  });

  it('binds a channel by entering an id and clicking the Bind button', async () => {
    makeBindings([]);
    setup();
    revealChannels();

    const input = await screen.findByTestId('streamsSlackAppChannelIdInput');
    const bindBtn = screen.getByTestId('streamsSlackAppBindChannelButton');

    // Empty input keeps the button disabled.
    expect(bindBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: '  C0123456789  ' } });
    expect(bindBtn).toBeEnabled();

    fireEvent.click(bindBtn);
    expect(bindChannel).toHaveBeenCalledWith('C0123456789');

    // The field is cleared once the bind resolves.
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('offers to reconnect Slack when private channel access is missing', async () => {
    makeBindings([]);
    mockUseBindChannel.mockReturnValue({
      bind: bindChannel,
      isLoading: false,
      clearFailure: jest.fn(),
      failure: { reason: 'private_channel_access_required', message: 'ignored' },
    });
    setup();
    revealChannels();

    expect(await screen.findByTestId('streamsSlackAppBindFailure')).toHaveTextContent(
      'Reconnect Slack and allow it'
    );
    expect(screen.getByTestId('streamsSlackAppBindFailureReconnect')).toBeInTheDocument();
    expect(screen.getByTestId('streamsSlackAppBindFailureRetry')).toBeInTheDocument();
  });

  it('shows pagination controls and steps forward using the relay cursor', async () => {
    makeBindings([{ channel: 'C001', status: 'bound_to_self' }], 'cursor-2');
    setup();
    revealChannels();

    const next = await screen.findByTestId('streamsSlackAppChannelsNextPage');
    expect(screen.getByTestId('streamsSlackAppChannelsPageLabel')).toHaveTextContent('Page 1');
    expect(screen.getByTestId('streamsSlackAppChannelsPreviousPage')).toBeDisabled();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    await waitFor(() =>
      expect(screen.getByTestId('streamsSlackAppChannelsPageLabel')).toHaveTextContent('Page 2')
    );
    expect(screen.getByTestId('streamsSlackAppChannelsPreviousPage')).toBeEnabled();
    // The next page is fetched with the cursor returned by the previous page.
    expect(mockUseRelayAppBindings).toHaveBeenLastCalledWith(true, 'cursor-2');
  });
});
