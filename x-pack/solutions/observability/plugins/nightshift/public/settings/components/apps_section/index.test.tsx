/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import type { SlackChannelBinding } from '@kbn/significant-events-plugin/common';
import { useRelayAppBindings, useBindChannel, useUnbindChannel } from './use_relay_app_bindings';

// Mock the hooks that depend on Kibana context — keep the component under test
// isolated so we can drive its UI purely through controlled bindings.
jest.mock('./use_relay_app_bindings');
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
  mockUseBindChannel.mockReturnValue({ bind: bindChannel, isLoading: false });
  mockUseUnbindChannel.mockReturnValue({ unbind: unbindChannel, isLoading: false });
}

function setup(canEdit = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AppsSection canEdit={canEdit} />
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

    it('shows the workspace URL, name, and team ID, and hides the channel controls', () => {
      mockPendingConfirmation({
        tenantKey: 'T0123ABC',
        name: 'Acme',
        url: 'https://acme.slack.com/',
      });
      setup();

      const callout = screen.getByTestId('streamsSlackAppConfirmWorkspace');
      expect(callout).toHaveTextContent('https://acme.slack.com/');
      expect(callout).toHaveTextContent('Acme');
      expect(callout).toHaveTextContent('T0123ABC');
      expect(screen.queryByTestId('streamsSlackAppChannelIdInput')).not.toBeInTheDocument();
    });

    it('still shows the team ID when the Relay reports no name or URL', () => {
      mockPendingConfirmation({ tenantKey: 'T0123ABC' });
      setup();

      expect(screen.getByTestId('streamsSlackAppConfirmWorkspace')).toHaveTextContent('T0123ABC');
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

    it('disables confirm and reject when canEdit is false', () => {
      mockPendingConfirmation({ tenantKey: 'T0123ABC' });
      setup(false);

      expect(screen.getByTestId('streamsSlackAppConfirmWorkspaceButton')).toBeDisabled();
      expect(screen.getByTestId('streamsSlackAppRejectWorkspaceButton')).toBeDisabled();
    });
  });

  it('explains when apps are unavailable in this deployment', () => {
    mockUseRelayAppConnection.mockReturnValue({
      isLoading: false,
      hasStatusRequestError: false,
      available: false,
      status: 'not_connected',
      error: undefined,
      isMutating: false,
      retryStatusRequest: mockRetryStatusRequest,
      connect: mockConnectWorkspace,
      disconnect: mockDisconnectWorkspace,
    });

    setup();

    const appsSection = screen.getByTestId('nightshiftAppsSection');
    expect(within(appsSection).getByTestId('nightshiftAppsUnavailable')).toHaveTextContent(
      'Apps are unavailable'
    );
    expect(within(appsSection).getByTestId('nightshiftAppsUnavailable')).toHaveTextContent(
      'Apps require Agent Builder and a configured Relay service.'
    );
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

    fireEvent.change(input, { target: { value: '  C789  ' } });
    expect(bindBtn).toBeEnabled();

    fireEvent.click(bindBtn);
    expect(bindChannel).toHaveBeenCalledWith('C789');

    // The field is cleared once the bind resolves.
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('shows an Unbind button for a connected channel and opens a confirm modal', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();
    revealChannels();

    const btn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    // Confirm modal should appear
    const modal = await screen.findByTestId('streamsSlackAppUnbindConfirmModal');
    expect(modal).toBeInTheDocument();

    // Confirming calls unbind — scope to the modal to avoid matching the list button
    const confirmBtn = within(modal).getByRole('button', { name: /^disconnect$/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(unbindChannel).toHaveBeenCalledWith('C123'));
  });

  it('opens a confirm modal and disconnects the workspace on confirm', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    const disconnectBtn = await screen.findByTestId('streamsSlackAppDisconnectButton');
    fireEvent.click(disconnectBtn);

    const modal = await screen.findByTestId('streamsSlackAppDisconnectConfirmModal');
    expect(modal).toBeInTheDocument();

    const confirmBtn = within(modal).getByRole('button', { name: /disconnect workspace/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockDisconnectWorkspace).toHaveBeenCalledTimes(1));
  });

  it('cancel on the workspace disconnect confirm modal does not disconnect', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    const disconnectBtn = await screen.findByTestId('streamsSlackAppDisconnectButton');
    fireEvent.click(disconnectBtn);

    const modal = await screen.findByTestId('streamsSlackAppDisconnectConfirmModal');
    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(mockDisconnectWorkspace).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('streamsSlackAppDisconnectConfirmModal')).not.toBeInTheDocument()
    );
  });

  it('cancel on the unbind confirm modal does not call unbind', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();
    revealChannels();

    const btn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');
    fireEvent.click(btn);

    const modal = await screen.findByTestId('streamsSlackAppUnbindConfirmModal');
    expect(modal).toBeInTheDocument();

    const cancelBtn = within(modal).getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(unbindChannel).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByTestId('streamsSlackAppUnbindConfirmModal')).not.toBeInTheDocument()
    );
  });

  it('disables the Bind and Unbind controls when canEdit is false', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup(false /* canEdit = false */);
    revealChannels();

    const input = await screen.findByTestId('streamsSlackAppChannelIdInput');
    fireEvent.change(input, { target: { value: 'C789' } });

    expect(input).toBeDisabled();
    expect(screen.getByTestId('streamsSlackAppBindChannelButton')).toBeDisabled();
    expect(screen.getByTestId('streamsSlackAppUnbindChannelButton')).toBeDisabled();
  });

  it('renders one row per connected channel', async () => {
    makeBindings([
      { channel: 'C001', status: 'bound_to_self' },
      { channel: 'C002', status: 'bound_to_self' },
    ]);
    setup();
    revealChannels();

    expect(await screen.findByText('C001')).toBeInTheDocument();
    expect(screen.getByText('C002')).toBeInTheDocument();
  });

  it('hides pagination controls when there is a single page', async () => {
    makeBindings([{ channel: 'C001', status: 'bound_to_self' }] /* no nextCursor */);
    setup();
    revealChannels();

    await screen.findByText('C001');
    expect(screen.queryByTestId('streamsSlackAppChannelsNextPage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppChannelsPreviousPage')).not.toBeInTheDocument();
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

  it('shows the connected workspace label alongside the channels toggle', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    mockUseRelayAppConnection.mockReturnValue({
      ...mockUseRelayAppConnection(),
      workspace: { tenantKey: 'T0123ABC', name: 'Acme Corp', url: 'https://acme-corp.slack.com/' },
    });
    setup();

    expect(screen.getByTestId('streamsSlackAppWorkspace')).toHaveTextContent(
      'Workspace: Acme Corp (acme-corp.slack.com)'
    );
    revealChannels();
    expect(await screen.findByTestId('streamsSlackAppChannelIdInput')).toBeInTheDocument();
    expect(screen.getByText('C123')).toBeInTheDocument();
  });
});
