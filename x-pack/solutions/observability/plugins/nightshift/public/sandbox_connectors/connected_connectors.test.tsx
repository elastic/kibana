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
  fetchError,
  collapseSignal = 0,
  capabilities = { save: true, delete: true },
}: {
  connectors: SandboxConnector[];
  fetchError?: Error;
  collapseSignal?: number;
  capabilities?: { save?: boolean; delete?: boolean };
}) => {
  const fetch = jest.fn().mockResolvedValue({ connectors });
  if (fetchError) fetch.mockRejectedValueOnce(fetchError);
  const http = { delete: jest.fn().mockResolvedValue({}) };
  const getEditConnectorFlyout = jest.fn(() => <div data-test-subj="editConnectorFlyoutStub" />);
  mockFetchConnector.mockResolvedValue({ id: 'github', actionTypeId: '.github', name: 'x' });
  mockUseKibana.mockReturnValue({
    services: {
      http,
      notifications: { toasts: { addError: jest.fn() } },
      application: {
        capabilities: { actions: capabilities },
        getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
      },
      nightshiftInvestigations: { investigationsClient: { fetch } },
      triggersActionsUi: {
        getEditConnectorFlyout,
        actionTypeRegistry: {
          has: () => true,
          get: () => ({ iconClass: 'logoGithub', actionTypeTitle: 'GitHub' }),
        },
      },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ConnectedConnectors collapseSignal={collapseSignal} />
      </QueryClientProvider>
    </I18nProvider>
  );
  const rerender = (signal: number) =>
    view.rerender(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <ConnectedConnectors collapseSignal={signal} />
        </QueryClientProvider>
      </I18nProvider>
    );
  return { http, getEditConnectorFlyout, fetch, rerender };
};

describe('ConnectedConnectors', () => {
  it('lists the connected connectors with their count and type', async () => {
    setup({ connectors: [connector('github'), connector('telemetry', true)] });

    const accordion = await screen.findByTestId('nightshiftConnectedConnectors');
    expect(accordion).toHaveTextContent('Connected');
    expect(accordion).toHaveTextContent('2');
    expect(screen.getByTestId('nightshiftConnectedConnectorCard-github')).toHaveTextContent(
      'GitHub'
    );
  });

  it('renders nothing when there is no connector', async () => {
    setup({ connectors: [] });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('nightshiftConnectedConnectors')).not.toBeInTheDocument();
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

  it('opens the edit flyout with the loaded connector', async () => {
    const { getEditConnectorFlyout } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftEditConnector-github'));

    expect(await screen.findByTestId('editConnectorFlyoutStub')).toBeInTheDocument();
    expect(mockFetchConnector).toHaveBeenCalledWith('github', expect.anything());
    expect(getEditConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ connector: expect.objectContaining({ id: 'github' }) })
    );
  });

  it('deletes a connector after confirmation and refreshes the list', async () => {
    const { http, fetch } = setup({ connectors: [connector('github')] });

    fireEvent.click(await screen.findByTestId('nightshiftConnectorMenu-github'));
    fireEvent.click(await screen.findByTestId('nightshiftConnectorDelete-github'));
    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(http.delete).toHaveBeenCalledWith('/api/actions/connector/github'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('locks edit and delete for preconfigured connectors', async () => {
    setup({ connectors: [connector('telemetry', true)] });

    expect(await screen.findByTestId('nightshiftEditConnector-telemetry')).toBeDisabled();
    fireEvent.click(screen.getByTestId('nightshiftConnectorMenu-telemetry'));
    expect(await screen.findByTestId('nightshiftConnectorDelete-telemetry')).toBeDisabled();
  });

  it('collapses when the collapse signal changes', async () => {
    const { rerender } = setup({ connectors: [connector('github')] });

    const card = await screen.findByTestId('nightshiftConnectedConnectorCard-github');
    expect(card).toBeVisible();

    await act(async () => rerender(1));

    await waitFor(() =>
      expect(screen.getByTestId('nightshiftConnectedConnectorCard-github')).not.toBeVisible()
    );
  });
});
