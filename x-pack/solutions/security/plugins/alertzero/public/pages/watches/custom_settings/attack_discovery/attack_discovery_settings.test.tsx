/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  type Worker,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { AttackDiscoverySettings } from './attack_discovery_settings';

const CUSTOM_AGENT_ID = 'my-custom-agent';

const attackDiscoveryWorker: Worker = {
  id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  name: 'Attack Discovery',
  watchIds: [SYSTEM_SECURITY_WATCH_FLOOR_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    autonomy: 'manual',
  },
};

const listAgents = jest.fn();

const renderSettings = ({
  settings = attackDiscoveryWorker.settings,
  onExtrasChange = jest.fn(),
}: { settings?: WorkerSettings; onExtrasChange?: jest.Mock } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <KibanaContextProvider services={{ agentBuilder: { agents: { list: listAgents } } }}>
      <QueryClientProvider client={queryClient}>
        <AttackDiscoverySettings
          worker={attackDiscoveryWorker}
          settings={settings}
          onExtrasChange={onExtrasChange}
        />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
  return { onExtrasChange };
};

describe('AttackDiscoverySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listAgents.mockResolvedValue([
      { id: agentBuilderDefaultAgentId, name: 'Default agent', readonly: false },
      { id: CUSTOM_AGENT_ID, name: 'My custom agent', readonly: false },
      { id: 'platform-builtin', name: 'Platform built-in', readonly: true },
    ]);
  });

  it('renders the agent picker', async () => {
    renderSettings();

    expect(await screen.findByTestId('alertZeroAttackDiscoveryAgentSelector')).toBeInTheDocument();
  });

  it('shows the default agent without storing it when no agent has been picked', async () => {
    const { onExtrasChange } = renderSettings();

    await screen.findByTestId('alertZeroAttackDiscoveryAgentSelector');

    expect(onExtrasChange).not.toHaveBeenCalled();
  });

  it('stores the complete extras object when an agent is picked', async () => {
    const { onExtrasChange } = renderSettings();

    fireEvent.click(await screen.findByTestId('alertZeroAttackDiscoveryAgentSelector'));
    fireEvent.click(await screen.findByText('My custom agent'));

    await waitFor(() => {
      expect(onExtrasChange).toHaveBeenCalledWith({ agentId: CUSTOM_AGENT_ID });
    });
  });

  it('excludes platform built-in (readonly) agents from the options', async () => {
    renderSettings();

    fireEvent.click(await screen.findByTestId('alertZeroAttackDiscoveryAgentSelector'));

    await screen.findByText('My custom agent');
    expect(screen.queryByText('Platform built-in')).not.toBeInTheDocument();
  });

  it('keeps a stored agent id visible when it is missing from the fetched list', async () => {
    listAgents.mockResolvedValue([
      { id: agentBuilderDefaultAgentId, name: 'Default agent', readonly: false },
    ]);

    renderSettings({
      settings: { ...attackDiscoveryWorker.settings, extras: { agentId: 'deleted-agent' } },
    });

    expect(await screen.findByText('deleted-agent')).toBeInTheDocument();
  });

  it('drops the agent key when the user selects the default agent back', async () => {
    // Absent is not the same as the default id: storing `elastic-ai-agent` would
    // pin the Worker to today's default forever instead of following it.
    const { onExtrasChange } = renderSettings({
      settings: { ...attackDiscoveryWorker.settings, extras: { agentId: CUSTOM_AGENT_ID } },
    });

    fireEvent.click(await screen.findByTestId('alertZeroAttackDiscoveryAgentSelector'));
    fireEvent.click(await screen.findByText('Default agent'));

    await waitFor(() => expect(onExtrasChange).toHaveBeenCalledWith({}));
    expect(onExtrasChange.mock.calls[0][0]).not.toHaveProperty('agentId');
  });
});
