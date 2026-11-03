/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import { useKibana } from '../hooks/use_kibana';
import { ManageConnectorsLink, SandboxConnectorsTable } from './sandbox_connectors';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_connector', () => ({
  fetchConnector: jest.fn(),
}));
const mockFetchConnector = fetchConnector as jest.Mock;

const mockUseKibana = useKibana as jest.Mock;

const connector = (id: string, is_preconfigured = false): SandboxConnector => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: '.http',
  is_preconfigured,
});

const forbiddenError = (): Error =>
  Object.assign(new Error('Forbidden'), {
    name: 'HttpFetchError',
    request: {},
    response: { status: 403 },
  });

const notFoundError = (): Error =>
  Object.assign(new Error('Not Found'), {
    name: 'HttpFetchError',
    request: {},
    response: { status: 404 },
  });

const setup = ({
  connectors,
  assigned = connectors.map(({ id }) => id),
  fetchError,
  agentError,
  capabilities = { show: true, save: true, delete: true },
  canUpdateAgent = true,
  canManageAgents = true,
  withTriggersActionsUi = true,
  ui = <SandboxConnectorsTable />,
}: {
  connectors: SandboxConnector[];
  assigned?: string[];
  fetchError?: Error;
  agentError?: Error;
  capabilities?: { show?: boolean; save?: boolean; delete?: boolean };
  canUpdateAgent?: boolean;
  canManageAgents?: boolean;
  withTriggersActionsUi?: boolean;
  ui?: React.ReactElement;
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
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  const getEditConnectorFlyout = jest.fn(() => <div data-test-subj="editConnectorFlyoutStub" />);
  mockFetchConnector.mockResolvedValue({ id: 'github', actionTypeId: '.http', name: 'x' });
  mockUseKibana.mockReturnValue({
    services: {
      http,
      agentBuilder: { agents },
      notifications: { toasts: { addError, addSuccess } },
      application: {
        capabilities: {
          actions: capabilities,
          agentBuilder: { manageAgents: canManageAgents },
        },
        getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
      },
      nightshiftInvestigations: { investigationsClient: { fetch } },
      triggersActionsUi: withTriggersActionsUi
        ? {
            getAddConnectorFlyout,
            getEditConnectorFlyout,
            actionTypeRegistry: {
              has: (id: string) => id === '.http',
              get: () => ({ iconClass: 'globe', actionTypeTitle: 'HTTP' }),
            },
          }
        : undefined,
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nProvider>
  );
  return {
    fetch,
    http,
    agents,
    addSuccess,
    addError,
    getAddConnectorFlyout,
    getEditConnectorFlyout,
  };
};

const expectRemoved = (agents: { removeConnectorFromAgent: jest.Mock }, connectorId: string) =>
  waitFor(() =>
    expect(agents.removeConnectorFromAgent).toHaveBeenCalledWith({
      agentId: 'nightshift.investigation',
      connectorId,
    })
  );

describe('SandboxConnectorsTable', () => {
  it('lists the connectors assigned to the agent with their type and preconfigured badge', async () => {
    const { fetch, agents } = setup({
      connectors: [connector('github'), connector('telemetry', true), connector('unassigned')],
      assigned: ['github', 'telemetry'],
    });

    const table = await screen.findByTestId('nightshiftSandboxConnectorsTable');
    expect(table).toHaveTextContent('Connector github');
    expect(table).toHaveTextContent('Connector telemetry');
    expect(table).not.toHaveTextContent('Connector unassigned');
    expect(table).toHaveTextContent('HTTP');
    expect(screen.getAllByText('Preconfigured')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/nightshift/sandbox_connectors',
      expect.anything()
    );
    expect(agents.get).toHaveBeenCalledWith('nightshift.investigation');
  });

  it('opens the edit flyout from the connector name', async () => {
    const { getEditConnectorFlyout } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftConnectorName-github'));

    expect(await screen.findByTestId('editConnectorFlyoutStub')).toBeInTheDocument();
    expect(mockFetchConnector).toHaveBeenCalledWith('github', expect.anything());
    expect(getEditConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ connector: expect.objectContaining({ id: 'github' }) })
    );
  });

  it('removes a connector from the agent and confirms with a toast', async () => {
    const { agents, addSuccess } = setup({
      connectors: [connector('github'), connector('telemetry', true)],
    });

    fireEvent.click(await screen.findByTestId('nightshiftConnectorRemove-github'));

    await expectRemoved(agents, 'github');
    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({ title: 'Connector github removed' })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('nightshiftConnectorRemove-github')).not.toBeInTheDocument()
    );
  });

  it('locks remove and delete when the user cannot edit the agent', async () => {
    setup({ connectors: [connector('github')], canUpdateAgent: false });

    expect(await screen.findByTestId('nightshiftConnectorRemove-github')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorDelete-github')).toBeDisabled();
  });

  it('locks remove and delete without the Agent Builder manage agents privilege', async () => {
    setup({ connectors: [connector('github')], canManageAgents: false });

    expect(await screen.findByTestId('nightshiftConnectorRemove-github')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorDelete-github')).toBeDisabled();
  });

  it('locks delete without the connector delete privilege', async () => {
    setup({
      connectors: [connector('github')],
      capabilities: { show: true, save: true, delete: false },
    });

    expect(await screen.findByTestId('nightshiftConnectorDelete-github')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorRemove-github')).toBeEnabled();
  });

  it('reports an update that failed', async () => {
    const { agents, addError } = setup({ connectors: [connector('github')] });
    agents.removeConnectorFromAgent.mockRejectedValueOnce(forbiddenError());

    fireEvent.click(await screen.findByTestId('nightshiftConnectorRemove-github'));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Could not update the investigation agent',
      })
    );
  });

  it('takes a connector off the agent, deletes it after confirmation and refreshes the list', async () => {
    const { http, fetch, agents } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftConnectorDelete-github'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await expectRemoved(agents, 'github');
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/api/actions/connector/github'));
    expect(agents.removeConnectorFromAgent.mock.invocationCallOrder[0]).toBeLessThan(
      http.delete.mock.invocationCallOrder[0]
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    // The agent is read again, so the row cannot come back from a stale assignment.
    await waitFor(() => expect(agents.get).toHaveBeenCalledTimes(2));
  });

  it('reports a failed delete and still refreshes', async () => {
    const { http, addError, fetch } = setup({ connectors: [connector('github')] });
    http.delete.mockRejectedValueOnce(forbiddenError());

    fireEvent.click(await screen.findByTestId('nightshiftConnectorDelete-github'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(addError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Could not delete connector Connector github',
      })
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('locks delete for preconfigured connectors', async () => {
    setup({ connectors: [connector('telemetry', true), connector('github')] });

    expect(await screen.findByTestId('nightshiftConnectorDelete-telemetry')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorDelete-github')).toBeEnabled();
  });

  it('shows an error with a retry when the connectors cannot be loaded', async () => {
    const { fetch } = setup({ connectors: [connector('github')], fetchError: forbiddenError() });

    expect(await screen.findByTestId('nightshiftSandboxConnectorsError')).toHaveTextContent(
      'Could not load the connectors.'
    );
    expect(screen.queryByTestId('nightshiftSandboxConnectorsEmpty')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftSandboxConnectorsErrorRetry'));

    expect(await screen.findByText('Connector github')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('points to onboarding when Nightshift is not enabled in the space', async () => {
    setup({ connectors: [connector('github')], agentError: notFoundError() });

    expect(await screen.findByTestId('nightshiftSandboxConnectorsNotEnabled')).toHaveTextContent(
      'Elastic Nightshift is not enabled in this space yet.'
    );
    expect(screen.getByTestId('nightshiftSandboxConnectorsEnableLink')).toHaveAttribute(
      'href',
      '/app/nightshift/?onboarding=1'
    );
    expect(screen.queryByTestId('nightshiftSandboxConnectorsError')).not.toBeInTheDocument();
  });

  it('shows an error with a retry when the agent cannot be loaded', async () => {
    const { agents } = setup({ connectors: [connector('github')], agentError: forbiddenError() });

    expect(await screen.findByTestId('nightshiftSandboxConnectorsError')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftSandboxConnectorsErrorRetry'));

    expect(await screen.findByText('Connector github')).toBeInTheDocument();
    expect(agents.get).toHaveBeenCalledTimes(2);
  });
});

describe('ManageConnectorsLink', () => {
  it('links to the connectors management page', () => {
    setup({ connectors: [], ui: <ManageConnectorsLink /> });

    expect(screen.getByTestId('nightshiftManageConnectorsLink')).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/triggersActionsConnectors'
    );
  });

  it('is hidden when the user cannot see connectors', () => {
    setup({ connectors: [], capabilities: { show: false }, ui: <ManageConnectorsLink /> });

    expect(screen.queryByTestId('nightshiftManageConnectorsLink')).not.toBeInTheDocument();
  });
});
