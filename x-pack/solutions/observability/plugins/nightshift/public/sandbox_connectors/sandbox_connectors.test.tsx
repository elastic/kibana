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
import {
  CreateConnectorButton,
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from './sandbox_connectors';

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

const setup = ({
  connectors,
  fetchError,
  capabilities = { show: true, save: true, delete: true },
  withTriggersActionsUi = true,
  ui = <SandboxConnectorsTable />,
}: {
  connectors: SandboxConnector[];
  fetchError?: Error;
  capabilities?: { show?: boolean; save?: boolean; delete?: boolean };
  withTriggersActionsUi?: boolean;
  ui?: React.ReactElement;
}) => {
  const fetch = jest.fn().mockResolvedValue({ connectors });
  if (fetchError) fetch.mockRejectedValueOnce(fetchError);
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  const getEditConnectorFlyout = jest.fn(() => <div data-test-subj="editConnectorFlyoutStub" />);
  const http = { delete: jest.fn().mockResolvedValue({}) };
  mockFetchConnector.mockResolvedValue({ id: 'github', actionTypeId: '.http', name: 'x' });
  mockUseKibana.mockReturnValue({
    services: {
      http,
      notifications: { toasts: { addError: jest.fn() } },
      application: {
        capabilities: { actions: capabilities },
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
  return { fetch, http, getAddConnectorFlyout, getEditConnectorFlyout };
};

describe('SandboxConnectorsTable', () => {
  it('lists the connectors with their type and preconfigured badge', async () => {
    const { fetch } = setup({ connectors: [connector('github'), connector('telemetry', true)] });

    const table = await screen.findByTestId('nightshiftSandboxConnectorsTable');
    expect(table).toHaveTextContent('Connector github');
    expect(table).toHaveTextContent('Connector telemetry');
    expect(table).toHaveTextContent('HTTP');
    expect(screen.getAllByText('Preconfigured')).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/nightshift/sandbox_connectors',
      expect.anything()
    );
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

  it('deletes a connector after confirmation and refreshes the list', async () => {
    const { http, fetch } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftConnectorDelete-github'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/api/actions/connector/github'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('locks delete for preconfigured connectors', async () => {
    setup({ connectors: [connector('telemetry', true), connector('github')] });

    expect(await screen.findByTestId('nightshiftConnectorDelete-telemetry')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorDelete-github')).toBeEnabled();
  });

  it('explains what a connector does for the agent when there is none', async () => {
    setup({ connectors: [] });

    expect(await screen.findByTestId('nightshiftSandboxConnectorsEmpty')).toHaveTextContent(
      'Create one and the investigation agent can use it from its sandbox'
    );
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
});

describe('CreateConnectorButton', () => {
  it('opens the standard connector flyout', async () => {
    const { getAddConnectorFlyout } = setup({ connectors: [], ui: <CreateConnectorButton /> });

    (await screen.findByTestId('nightshiftCreateConnectorButton')).click();

    expect(getAddConnectorFlyout).toHaveBeenCalledWith({ onClose: expect.any(Function) });
    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
  });

  it('is hidden when the user cannot create connectors', () => {
    setup({
      connectors: [],
      capabilities: { show: true, save: false },
      ui: <CreateConnectorButton />,
    });

    expect(screen.queryByTestId('nightshiftCreateConnectorButton')).not.toBeInTheDocument();
  });

  it('is hidden when the connector flyout is not available', () => {
    setup({ connectors: [], withTriggersActionsUi: false, ui: <CreateConnectorButton /> });

    expect(screen.queryByTestId('nightshiftCreateConnectorButton')).not.toBeInTheDocument();
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
