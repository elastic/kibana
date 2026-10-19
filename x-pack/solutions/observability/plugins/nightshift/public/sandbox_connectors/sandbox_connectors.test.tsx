/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import {
  CreateConnectorButton,
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from './sandbox_connectors';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const connector = (id: string, is_preconfigured = false): SandboxConnector => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: '.http',
  is_preconfigured,
});

const setup = ({
  connectors,
  capabilities = { show: true, save: true },
  withTriggersActionsUi = true,
  ui = <SandboxConnectorsTable />,
}: {
  connectors: SandboxConnector[];
  capabilities?: { show?: boolean; save?: boolean };
  withTriggersActionsUi?: boolean;
  ui?: React.ReactElement;
}) => {
  const fetch = jest.fn().mockResolvedValue({ connectors });
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: { actions: capabilities },
        getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
      },
      nightshiftInvestigations: { investigationsClient: { fetch } },
      triggersActionsUi: withTriggersActionsUi
        ? {
            getAddConnectorFlyout,
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
  return { fetch, getAddConnectorFlyout };
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

  it('explains what a connector does for the agent when there is none', async () => {
    setup({ connectors: [] });

    expect(await screen.findByTestId('nightshiftSandboxConnectorsEmpty')).toHaveTextContent(
      'Create one and the investigation agent can use it from its sandbox'
    );
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
