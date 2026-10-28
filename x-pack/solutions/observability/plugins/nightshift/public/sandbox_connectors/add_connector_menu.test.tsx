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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { InvestigationAgentAddConnectorMenu } from './add_connector_menu';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;

const httpType = {
  id: '.http',
  name: 'HTTP',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
  isSystemActionType: false,
  isDeprecated: false,
};

const connector = (id: string): SandboxConnector => ({
  id,
  name: `Connector ${id}`,
  connector_type_id: '.http',
  is_preconfigured: false,
});

const setup = ({
  connectors,
  assigned = [],
  canUpdateAgent = true,
  canSave = true,
}: {
  connectors: SandboxConnector[];
  assigned?: string[];
  canUpdateAgent?: boolean;
  canSave?: boolean;
}) => {
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
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  const services = {
    agentBuilder: { agents },
    notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } },
    application: {
      capabilities: {
        actions: { show: true, execute: true, delete: true, save: canSave },
        agentBuilder: { manageAgents: true },
      },
      getUrlForApp: (app: string, { path }: { path: string }) => `/app/${app}${path}`,
    },
    nightshiftInvestigations: {
      investigationsClient: {
        fetch: jest.fn(async (endpoint: string) =>
          endpoint === 'GET /internal/nightshift/sandbox_connector_types'
            ? { connector_types: [httpType] }
            : { connectors }
        ),
      },
    },
    triggersActionsUi: {
      getAddConnectorFlyout,
      actionTypeRegistry: {
        has: () => true,
        get: () => ({ iconClass: 'globe', actionTypeTitle: 'HTTP' }),
      },
    },
  };
  mockUseKibana.mockReturnValue({ services });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <InvestigationAgentAddConnectorMenu />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return { agents, getAddConnectorFlyout };
};

const agentCall = (connectorId: string) => ({ agentId: 'nightshift.investigation', connectorId });

describe('InvestigationAgentAddConnectorMenu', () => {
  it('opens the connector library from the menu and assigns a connector with its switch', async () => {
    const { agents } = setup({
      connectors: [connector('github'), connector('datadog')],
      assigned: ['github'],
    });

    fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));
    fireEvent.click(await screen.findByTestId('agentConnectorsAddFromLibraryMenuItem'));

    const flyout = await screen.findByTestId('agentConnectorLibraryFlyout');
    expect(flyout).toHaveTextContent('Add connector');
    expect(flyout).toHaveTextContent('Showing 1-2 of 2 Connectors');
    expect(screen.getByRole('link', { name: /Manage connector library/ })).toHaveAttribute(
      'href',
      '/app/agent_builder/manage/connectors'
    );
    expect(screen.getByRole('switch', { name: 'Connector github' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Connector datadog' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('switch', { name: 'Connector datadog' }));

    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith(agentCall('datadog'))
    );
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Connector datadog' })).toBeChecked()
    );
  });

  it('removes a connector from the agent with its library switch', async () => {
    const { agents } = setup({ connectors: [connector('github')], assigned: ['github'] });

    fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));
    fireEvent.click(await screen.findByTestId('agentConnectorsAddFromLibraryMenuItem'));
    fireEvent.click(await screen.findByRole('switch', { name: 'Connector github' }));

    await waitFor(() =>
      expect(agents.removeConnectorFromAgent).toHaveBeenCalledWith(agentCall('github'))
    );
  });

  it('filters the library by name or type', async () => {
    setup({ connectors: [connector('github'), connector('datadog')] });

    fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));
    fireEvent.click(await screen.findByTestId('agentConnectorsAddFromLibraryMenuItem'));
    await screen.findByRole('switch', { name: 'Connector github' });
    fireEvent.change(screen.getByPlaceholderText('Search connectors'), {
      target: { value: 'data' },
    });

    expect(screen.queryByRole('switch', { name: 'Connector github' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Connector datadog' })).toBeInTheDocument();
    expect(screen.getByTestId('agentConnectorLibraryFlyout')).toHaveTextContent(
      'Showing 1-1 of 2 Connectors'
    );
  });

  it('picks a sandbox connector type, creates the connector and assigns it', async () => {
    const { agents, getAddConnectorFlyout } = setup({ connectors: [] });

    fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));
    fireEvent.click(await screen.findByTestId('agentConnectorsCreateNewMenuItem'));

    fireEvent.click(await screen.findByTestId('.http-select'));

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    const props = (getAddConnectorFlyout.mock.calls as unknown as Array<[unknown]>)[0][0] as {
      initialConnector: { actionTypeId: string };
      onConnectorCreated: (connector: { id: string; name: string }) => void;
    };
    expect(props.initialConnector).toEqual({ actionTypeId: '.http' });
    props.onConnectorCreated({ id: 'new', name: 'New' });
    await waitFor(() => expect(agents.addConnectorToAgent).toHaveBeenCalledWith(agentCall('new')));
  });

  it('renders nothing without full connector privileges, like Agent Builder', async () => {
    setup({ connectors: [], canSave: false });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('nightshiftAddConnectorButton')).not.toBeInTheDocument();
  });

  it('renders nothing when the user cannot edit the agent', async () => {
    setup({ connectors: [connector('github')], canUpdateAgent: false });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('nightshiftAddConnectorButton')).not.toBeInTheDocument();
  });
});
