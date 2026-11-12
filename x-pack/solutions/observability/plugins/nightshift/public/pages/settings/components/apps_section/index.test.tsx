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
import {
  useRelayAppBindings,
  useBindChannel,
  useUnbindChannel,
} from '../../../../data/relay_apps/use_relay_app_bindings';

// Mock the hooks that depend on Kibana context — keep the component under test
// isolated so we can drive its UI purely through controlled bindings.
jest.mock('../../../../data/relay_apps/use_relay_app_bindings', () => ({
  ...jest.requireActual('../../../../data/relay_apps/use_relay_app_bindings'),
  useRelayAppBindings: jest.fn(),
  useAllRelayAppBindings: () => mockUseAllRelayAppBindings(),
  useBindChannel: jest.fn(),
  useUnbindChannel: jest.fn(),
}));
const mockUseFetchAutomations = jest.fn();
const mockUseAllRelayAppBindings = jest.fn();
jest.mock('../../../../data/automations/use_automations', () => ({
  useFetchAutomations: () => mockUseFetchAutomations(),
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

// SlackChannelsSection pulls the connection state and the bindings together.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SlackChannelsSection } = require('.');

const bindChannel = jest.fn().mockResolvedValue(undefined);
const unbindChannel = jest.fn().mockResolvedValue(undefined);

const connected = () => ({
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

function setup(canEdit = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <SlackChannelsSection canEdit={canEdit} />
      </QueryClientProvider>
    </I18nProvider>
  );
}

const openWorkspaceDisconnect = async () => {
  fireEvent.click(await screen.findByTestId('streamsSlackAppWorkspaceMenuButton'));
  fireEvent.click(await screen.findByTestId('streamsSlackAppDisconnectButton'));
};

const openConnectChannel = async () => {
  fireEvent.click(await screen.findByTestId('streamsSlackAppOpenConnectChannelButton'));
  return screen.findByTestId('streamsSlackAppChannelIdInput');
};

describe('SlackChannelsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRelayAppConnection.mockReturnValue(connected());
    mockUseFetchAutomations.mockReturnValue({ data: undefined });
    mockUseAllRelayAppBindings.mockReturnValue({ bindings: [], isError: false, isComplete: true });
    makeBindings([]);
  });

  describe('when a workspace is awaiting confirmation', () => {
    const mockPendingConfirmation = (workspace: {
      tenantKey: string;
      name?: string;
      url?: string;
    }) =>
      mockUseRelayAppConnection.mockReturnValue({
        ...connected(),
        status: 'pending_confirmation',
        workspace,
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
      expect(screen.queryByTestId('streamsSlackAppWorkspaceMenuButton')).not.toBeInTheDocument();
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

  it('renders nothing while the status is loading', () => {
    mockUseRelayAppConnection.mockReturnValue({ ...connected(), isLoading: true });

    setup();

    expect(screen.queryByTestId('nightshiftSlackChannelsSection')).not.toBeInTheDocument();
  });

  it('renders nothing when the Slack App is unavailable in this deployment', () => {
    mockUseRelayAppConnection.mockReturnValue({
      ...connected(),
      available: false,
      status: 'not_connected',
    });

    setup();

    expect(screen.queryByTestId('nightshiftSlackChannelsSection')).not.toBeInTheDocument();
  });

  it('shows a retry when the status request failed, instead of hiding the section', () => {
    mockUseRelayAppConnection.mockReturnValue({
      ...connected(),
      hasStatusRequestError: true,
      available: false,
      status: 'not_connected',
    });

    setup();

    expect(screen.getByTestId('nightshiftSlackStatusError')).toHaveTextContent(
      'Unable to check the Slack App status'
    );
    expect(screen.queryByTestId('streamsSlackAppConnectButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftSlackConnectedBadge')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftSlackStatusRetryButton'));
    expect(mockRetryStatusRequest).toHaveBeenCalledTimes(1);
  });

  it('offers to connect Slack when no workspace is connected', () => {
    mockUseRelayAppConnection.mockReturnValue({ ...connected(), status: 'not_connected' });

    setup();

    expect(screen.getByTestId('nightshiftSlackChannelsSection')).toHaveTextContent(
      'Connect Slack to @Elastic'
    );
    expect(screen.getByTestId('streamsSlackAppPrivateChannelsNote')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftSlackConnectedBadge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppChannelIdInput')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('streamsSlackAppConnectButton'));
    expect(mockConnectWorkspace).toHaveBeenCalledTimes(1);
  });

  it('disables connect when canEdit is false', () => {
    mockUseRelayAppConnection.mockReturnValue({ ...connected(), status: 'not_connected' });

    setup(false);

    expect(screen.getByTestId('streamsSlackAppConnectButton')).toBeDisabled();
  });

  it('lets the user cancel while authorization is in progress', () => {
    mockUseRelayAppConnection.mockReturnValue({ ...connected(), status: 'oauth_in_progress' });

    setup();

    expect(screen.getByTestId('nightshiftSlackChannelsSection')).toHaveTextContent(
      'Waiting for authorization'
    );
    fireEvent.click(screen.getByTestId('streamsSlackAppCancelButton'));
    expect(mockDisconnectWorkspace).toHaveBeenCalledTimes(1);
  });

  it('shows the channels with a connected badge once the workspace is connected', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    expect(screen.getByTestId('nightshiftSlackConnectedBadge')).toHaveTextContent('Connected');
    expect(await screen.findByTestId('streamsSlackAppOpenConnectChannelButton')).toBeEnabled();
    expect(screen.getByText('C123')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppConnectButton')).not.toBeInTheDocument();
  });

  it.each([
    ['who connected it', 'alice', 'acme-corp.slack.com · Connected by alice on Oct 19, 2026'],
    [
      'only the date when the install had no username',
      undefined,
      'acme-corp.slack.com · Connected on Oct 19, 2026',
    ],
  ])(
    'shows the workspace name, host and %s in the badge tooltip',
    async (_label, createdBy, tip) => {
      mockUseRelayAppConnection.mockReturnValue({
        ...connected(),
        workspace: {
          tenantKey: 'T0123ABC',
          name: 'Acme Corp',
          url: 'https://acme-corp.slack.com/',
        },
        createdBy,
        createdAt: '2026-10-19T12:00:00.000Z',
      });
      setup();

      const badge = screen.getByTestId('nightshiftSlackConnectedBadge');
      expect(badge).toHaveTextContent('Acme Corp');
      fireEvent.mouseOver(badge);
      expect(await screen.findByTestId('nightshiftSlackWorkspaceTooltip')).toHaveTextContent(tip);
    }
  );

  it('connects a channel from the modal by entering an id', async () => {
    setup();

    const input = await openConnectChannel();
    const bindBtn = screen.getByTestId('streamsSlackAppBindChannelButton');

    // Empty input keeps the button disabled.
    expect(bindBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: '  C0123456789  ' } });
    expect(bindBtn).toBeEnabled();

    fireEvent.click(bindBtn);
    expect(bindChannel).toHaveBeenCalledWith('C0123456789');

    await waitFor(() =>
      expect(screen.queryByTestId('streamsSlackAppConnectChannelModal')).not.toBeInTheDocument()
    );
  });

  it('shows an Unbind button for a connected channel and opens a confirm modal', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    const btn = await screen.findByTestId('streamsSlackAppUnbindChannelButton');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    // Confirm modal should appear
    const modal = await screen.findByTestId('streamsSlackAppUnbindConfirmModal');
    expect(modal).toBeInTheDocument();

    // Confirming calls unbind — scope to the modal to avoid matching the list button
    const confirmBtn = within(modal).getByRole('button', { name: /^disconnect channel$/i });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(unbindChannel).toHaveBeenCalledWith('C123'));
  });

  it('names the automations that stop triggering when a channel is disconnected', async () => {
    const slackAutomation = (name: string, channels: string[]) => ({
      name,
      isEnabled: true,
      trigger: { rows: [{ kind: 'slack', event: 'message', channels }] },
    });
    mockUseFetchAutomations.mockReturnValue({
      data: {
        automations: [
          slackAutomation('Triage on-call', ['C123']),
          slackAutomation('Other channel', ['C999']),
        ],
      },
    });
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    fireEvent.click(await screen.findByTestId('streamsSlackAppUnbindChannelButton'));

    const warning = await screen.findByTestId('streamsSlackAppAffectedAutomations');
    expect(warning).toHaveTextContent('1 automation will stop triggering from Slack');
    expect(warning).toHaveTextContent('Triage on-call');
    expect(warning).not.toHaveTextContent('Other channel');
  });

  it('explains a workspace disconnect with no connected channels, without an automations warning', async () => {
    mockUseFetchAutomations.mockReturnValue({
      data: {
        automations: [
          {
            name: 'Test Slack triggers',
            isEnabled: true,
            trigger: { rows: [{ kind: 'slack', event: 'message', channels: ['C123'] }] },
          },
        ],
      },
    });
    mockUseRelayAppConnection.mockReturnValue({
      ...connected(),
      workspace: { tenantKey: 'T1', name: 'Acme' },
    });
    setup();

    await openWorkspaceDisconnect();

    const modal = await screen.findByTestId('streamsSlackAppDisconnectConfirmModal');
    expect(modal).toHaveTextContent('Disconnect Acme from this project?');
    expect(modal).toHaveTextContent(
      "No channels are connected to this project. Other Elastic projects that use Acme aren't affected."
    );
    expect(screen.queryByTestId('streamsSlackAppAffectedAutomations')).not.toBeInTheDocument();
  });

  it('does not claim that no channels are connected when the channel list failed to load', async () => {
    mockUseAllRelayAppBindings.mockReturnValue({ bindings: [], isError: true, isComplete: true });
    setup();

    await openWorkspaceDisconnect();

    const modal = await screen.findByTestId('streamsSlackAppDisconnectConfirmModal');
    expect(modal).not.toHaveTextContent('No channels are connected');
  });

  it('opens a confirm modal from the section header and disconnects the workspace on confirm', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    mockUseAllRelayAppBindings.mockReturnValue({
      bindings: [{ channel: 'C123', status: 'bound_to_self' }],
      isError: false,
      isComplete: true,
    });
    setup();

    await openWorkspaceDisconnect();

    const modal = await screen.findByTestId('streamsSlackAppDisconnectConfirmModal');
    expect(modal).toHaveTextContent('@Elastic stops answering in the connected channels');

    const confirmBtn = within(modal).getByRole('button', { name: /disconnect workspace/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(mockDisconnectWorkspace).toHaveBeenCalledTimes(1));
  });

  it('cancel on the workspace disconnect confirm modal does not disconnect', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup();

    await openWorkspaceDisconnect();

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

  it('keeps the Bind button disabled for input that is not a channel id or link', async () => {
    setup();

    const input = await openConnectChannel();
    fireEvent.change(input, { target: { value: '#general' } });

    expect(screen.getByTestId('streamsSlackAppBindChannelButton')).toBeDisabled();
    expect(screen.getByTestId('streamsSlackAppChannelInputHelp')).toHaveTextContent(
      'Enter a channel ID'
    );
  });

  it('does not offer a one-click reconnect when private channel access is missing', async () => {
    mockUseBindChannel.mockReturnValue({
      bind: bindChannel,
      isLoading: false,
      clearFailure: jest.fn(),
      failure: { reason: 'private_channel_access_required', message: 'ignored' },
    });
    setup();

    await openConnectChannel();
    expect(await screen.findByTestId('streamsSlackAppBindFailure')).toHaveTextContent(
      'disconnect the workspace and connect it again'
    );
    expect(screen.queryByTestId('streamsSlackAppBindFailureReconnect')).not.toBeInTheDocument();
    expect(screen.getByTestId('streamsSlackAppBindFailureRetry')).toBeInTheDocument();
  });

  it('shows a private channel as an accessible lock icon with its id and no name', async () => {
    makeBindings([{ channel: 'G0123456789', visibility: 'private', status: 'bound_to_self' }]);
    setup();

    expect(await screen.findByTestId('slackPrivateChannelIcon')).toBeInTheDocument();
    expect(screen.getByText('G0123456789')).toBeInTheDocument();
  });

  it('disables the connect, disconnect channel and workspace menu controls when canEdit is false', async () => {
    makeBindings([{ channel: 'C123', status: 'bound_to_self' }]);
    setup(false /* canEdit = false */);

    expect(await screen.findByTestId('streamsSlackAppOpenConnectChannelButton')).toBeDisabled();
    expect(screen.getByTestId('streamsSlackAppUnbindChannelButton')).toBeDisabled();
    expect(screen.getByTestId('streamsSlackAppWorkspaceMenuButton')).toBeDisabled();
  });

  it('renders one row per connected channel', async () => {
    makeBindings([
      { channel: 'C001', status: 'bound_to_self' },
      { channel: 'C002', status: 'bound_to_self' },
    ]);
    setup();

    expect(await screen.findByText('C001')).toBeInTheDocument();
    expect(screen.getByText('C002')).toBeInTheDocument();
  });

  it('hides pagination controls when there is a single page', async () => {
    makeBindings([{ channel: 'C001', status: 'bound_to_self' }] /* no nextCursor */);
    setup();

    await screen.findByText('C001');
    expect(screen.queryByTestId('streamsSlackAppChannelsNextPage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('streamsSlackAppChannelsPreviousPage')).not.toBeInTheDocument();
  });

  it('shows pagination controls and steps forward using the relay cursor', async () => {
    makeBindings([{ channel: 'C001', status: 'bound_to_self' }], 'cursor-2');
    setup();

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
