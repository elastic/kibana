/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import { useKibana } from '../hooks/use_kibana';
import { ConnectedConnectors } from './connected_connectors';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_connector', () => ({
  fetchConnector: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockFetchConnector = fetchConnector as jest.Mock;

const connector = (id: string, is_preconfigured = false): SandboxConnector => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: '.github',
  is_preconfigured,
});

const forbiddenError = (): Error =>
  Object.assign(new Error('Forbidden'), {
    name: 'HttpFetchError',
    request: {},
    response: { status: 403 },
  });

const setup = ({
  connectors,
  assigned = connectors.map(({ id }) => id),
  fetchError,
  agentError,
  collapseSignal = 0,
  capabilities = { show: true, execute: true, save: true, delete: true },
  canUpdateAgent = true,
}: {
  connectors: SandboxConnector[];
  assigned?: string[];
  fetchError?: Error;
  agentError?: Error;
  collapseSignal?: number;
  capabilities?: { show?: boolean; execute?: boolean; save?: boolean; delete?: boolean };
  canUpdateAgent?: boolean;
}) => {
  const fetch = jest.fn().mockResolvedValue({ connectors });
  if (fetchError) fetch.mockRejectedValueOnce(fetchError);
  const agent = () => ({
    configuration: { connector_ids: assigned },
    permissions: { update_agent: canUpdateAgent },
  });
  const agents = {
    get: jest.fn(async () => agent()),
    addConnectorToAgent: jest.fn(async ({ connectorId }: { connectorId: string }) => {
      assigned = [...assigned, connectorId];
      return agent();
    }),
    removeConnectorFromAgent: jest.fn(async ({ connectorId }: { connectorId: string }) => {
      assigned = assigned.filter((id) => id !== connectorId);
      return agent();
    }),
  };
  if (agentError) agents.get.mockRejectedValueOnce(agentError);
  const http = { delete: jest.fn().mockResolvedValue({}) };
  const getEditConnectorFlyout = jest.fn(() => <div data-test-subj="editConnectorFlyoutStub" />);
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  mockFetchConnector.mockResolvedValue({ id: 'github', actionTypeId: '.github', name: 'x' });
  const services = {
    http,
    agentBuilder: { agents },
    docLinks: {
      links: { agentBuilder: { agentBuilderConnectors: 'https://docs.example/connectors' } },
    },
    notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } },
    application: {
      capabilities: { actions: capabilities, agentBuilder: { manageAgents: true } },
      getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
    },
    nightshiftInvestigations: { investigationsClient: { fetch } },
    triggersActionsUi: {
      getEditConnectorFlyout,
      getAddConnectorFlyout,
      actionTypeRegistry: {
        has: () => true,
        get: () => ({ iconClass: 'logoGithub', actionTypeTitle: 'GitHub' }),
      },
    },
  };
  mockUseKibana.mockReturnValue({ services });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // The Agent Builder components read the Kibana context directly.
  const ui = (signal: number) => (
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <ConnectedConnectors collapseSignal={signal} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  const view = render(ui(collapseSignal));
  const rerender = (signal: number) => view.rerender(ui(signal));
  return { agents, getEditConnectorFlyout, getAddConnectorFlyout, fetch, rerender };
};

const expectAdded = (agents: { addConnectorToAgent: jest.Mock }, connectorId: string) =>
  waitFor(() =>
    expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
      agentId: 'nightshift.investigation',
      connectorId,
    })
  );

describe('ConnectedConnectors', () => {
  it('lists the connectors assigned to the agent with their count and type', async () => {
    setup({
      connectors: [connector('github'), connector('telemetry', true), connector('other')],
      assigned: ['github', 'telemetry'],
    });

    const accordion = await screen.findByTestId('nightshiftConnectedConnectors');
    expect(accordion).toHaveTextContent('Connected');
    expect(accordion).toHaveTextContent('2');
    const card = screen.getByTestId('nightshiftConnectedConnectorCard-github');
    expect(card).toHaveTextContent('Connector github');
    expect(card).toHaveTextContent('GitHub');
    expect(screen.getByTestId('nightshiftAddConnectorButton')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftConnectedConnectorCard-other')).not.toBeInTheDocument();
  });

  describe('with nothing assigned to the agent', () => {
    it('opens on the add button with a zero count', async () => {
      setup({ connectors: [connector('github')], assigned: [] });

      expect(await screen.findByTestId('nightshiftConnectedConnectorsActions')).toBeVisible();
      expect(screen.getByTestId('nightshiftConnectedConnectorsCount')).toHaveTextContent('0');
      expect(screen.getByTestId('nightshiftAddConnectorButton')).toBeVisible();
      expect(screen.queryByText('No connectors assigned yet')).not.toBeInTheDocument();
    });

    it('assigns a connector from the library and shows its card, section still open', async () => {
      const { agents } = setup({ connectors: [connector('github')], assigned: [] });

      fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));
      await screen.findByTestId('agentConnectorLibraryFlyout');
      fireEvent.click(await screen.findByRole('switch', { name: 'Connector github' }));

      await expectAdded(agents, 'github');
      expect(await screen.findByTestId('nightshiftConnectedConnectorCard-github')).toBeVisible();
      // The library stays open, as in Agent Builder, so more connectors can be added.
      expect(screen.getByTestId('agentConnectorLibraryFlyout')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Connector github' })).toBeChecked();
    });

    it('offers no Add connector when the user cannot edit the agent', async () => {
      setup({ connectors: [connector('github')], assigned: [], canUpdateAgent: false });

      await screen.findByTestId('nightshiftConnectedConnectors');
      expect(screen.queryByTestId('nightshiftAddConnectorButton')).not.toBeInTheDocument();
    });
  });

  it('shows an error with a retry when the connectors cannot be loaded', async () => {
    const { fetch } = setup({ connectors: [connector('github')], fetchError: forbiddenError() });

    expect(await screen.findByTestId('nightshiftConnectedConnectorsError')).toHaveTextContent(
      'Could not load the connectors.'
    );

    fireEvent.click(screen.getByTestId('nightshiftConnectedConnectorsErrorRetry'));

    expect(await screen.findByTestId('nightshiftConnectedConnectors')).toHaveTextContent('1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows an error with a retry when the agent cannot be loaded', async () => {
    const { agents } = setup({ connectors: [connector('github')], agentError: forbiddenError() });

    expect(await screen.findByTestId('nightshiftConnectedConnectorsError')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftConnectedConnectorsErrorRetry'));

    expect(await screen.findByTestId('nightshiftConnectedConnectors')).toHaveTextContent('1');
    expect(agents.get).toHaveBeenCalledTimes(2);
  });

  it('opens the edit flyout with the loaded connector', async () => {
    const { getEditConnectorFlyout } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftEditConnector-github'));

    expect(await screen.findByTestId('editConnectorFlyoutStub')).toBeInTheDocument();
    expect(mockFetchConnector).toHaveBeenCalledWith('github', expect.anything());
    expect(getEditConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ connector: expect.objectContaining({ id: 'github' }) })
    );
  });

  it('locks edit for preconfigured connectors', async () => {
    setup({ connectors: [connector('telemetry', true)] });

    expect(await screen.findByTestId('nightshiftEditConnector-telemetry')).toBeDisabled();
  });

  it('starts folded, opens from its header, and folds again on the collapse signal', async () => {
    const { rerender } = setup({ connectors: [connector('github')] });

    const card = await screen.findByTestId('nightshiftConnectedConnectorCard-github');
    expect(card).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Connected/ }));
    await waitFor(() => expect(card).toBeVisible());

    await act(async () => rerender(1));

    await waitFor(() => expect(card).not.toBeVisible());
  });
});
