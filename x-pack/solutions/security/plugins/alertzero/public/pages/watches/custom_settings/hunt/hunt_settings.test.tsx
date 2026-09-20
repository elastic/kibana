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
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  type Worker,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { HuntSettings } from './hunt_settings';

const CUSTOM_AGENT_ID = 'my-custom-agent';

const huntWorker: Worker = {
  id: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  name: 'Continuous Threat Hunt',
  watchIds: [SYSTEM_SECURITY_WATCH_HUNT_ID],
  enabled: true,
  lastRun: null,
  state: 'ok',
  settingsRevision: 1,
  settings: {
    workerId: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
    autonomy: 'manual',
  },
};

const listAgents = jest.fn();

const renderSettings = ({
  settings = huntWorker.settings,
  onExtrasChange = jest.fn(),
}: { settings?: WorkerSettings; onExtrasChange?: jest.Mock } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <KibanaContextProvider services={{ agentBuilder: { agents: { list: listAgents } } }}>
      <QueryClientProvider client={queryClient}>
        <HuntSettings worker={huntWorker} settings={settings} onExtrasChange={onExtrasChange} />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
  return { onExtrasChange };
};

describe('HuntSettings', () => {
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

    expect(await screen.findByTestId('alertZeroHuntAgentSelector')).toBeInTheDocument();
  });

  it('shows the default agent without storing it when no agent has been picked', async () => {
    const { onExtrasChange } = renderSettings();

    await screen.findByTestId('alertZeroHuntAgentSelector');

    expect(screen.getByRole('button', { name: /Default agent|agent/i })).toBeInTheDocument();
    expect(onExtrasChange).not.toHaveBeenCalled();
  });

  it('stores the complete extras object when an agent is picked', async () => {
    const { onExtrasChange } = renderSettings();

    fireEvent.click(await screen.findByTestId('alertZeroHuntAgentSelector'));
    fireEvent.click(await screen.findByText('My custom agent'));

    await waitFor(() => {
      expect(onExtrasChange).toHaveBeenCalledWith({ agentId: CUSTOM_AGENT_ID });
    });
  });

  it('excludes platform built-in (readonly) agents from the options', async () => {
    renderSettings();

    fireEvent.click(await screen.findByTestId('alertZeroHuntAgentSelector'));

    await screen.findByText('My custom agent');
    expect(screen.queryByText('Platform built-in')).not.toBeInTheDocument();
  });

  it('keeps a stored agent id visible when it is missing from the fetched list', async () => {
    listAgents.mockResolvedValue([
      { id: agentBuilderDefaultAgentId, name: 'Default agent', readonly: false },
    ]);

    renderSettings({
      settings: { ...huntWorker.settings, extras: { agentId: 'deleted-agent' } },
    });

    expect(await screen.findByText('deleted-agent')).toBeInTheDocument();
  });

  it('renders without crashing when Agent Builder returns no agents', async () => {
    listAgents.mockResolvedValue([]);

    renderSettings();

    expect(await screen.findByTestId('alertZeroHuntAgentSelector')).toBeInTheDocument();
  });
});
