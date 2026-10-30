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
import type { ActionType } from '@kbn/actions-types';
import { useKibana } from '../hooks/use_kibana';
import { ConnectSourcesGrid } from './connect_sources_grid';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.Mock;
const mockFetchConnectorTypes = jest.fn();

const type = (id: string, overrides: Partial<ActionType> = {}): ActionType => ({
  id,
  name: `Type ${id}`,
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'enterprise',
  supportedFeatureIds: [],
  isSystemActionType: false,
  isDeprecated: false,
  ...overrides,
});

const forbiddenError = (): Error =>
  Object.assign(new Error('Forbidden'), {
    name: 'HttpFetchError',
    request: {},
    response: { status: 403 },
  });

const setup = ({
  types,
  canSave = true,
  canUpdateAgent = true,
  onConnected,
}: {
  types: ActionType[];
  canSave?: boolean;
  canUpdateAgent?: boolean;
  onConnected?: () => void;
}) => {
  mockFetchConnectorTypes.mockResolvedValue(types);
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  const agent = {
    configuration: { connector_ids: [] },
    permissions: { update_agent: canUpdateAgent },
  };
  const agents = {
    get: jest.fn(async () => agent),
    addConnectorToAgent: jest.fn().mockResolvedValue(agent),
    removeConnectorFromAgent: jest.fn().mockResolvedValue(agent),
  };
  mockUseKibana.mockReturnValue({
    services: {
      agentBuilder: { agents },
      notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } },
      application: {
        capabilities: { actions: { save: canSave }, agentBuilder: { manageAgents: true } },
      },
      nightshiftInvestigations: {
        investigationsClient: {
          fetch: jest.fn(async (endpoint: string) =>
            endpoint === 'GET /internal/nightshift/sandbox_connector_types'
              ? { connector_types: await mockFetchConnectorTypes() }
              : { connectors: [] }
          ),
        },
      },
      triggersActionsUi: {
        getAddConnectorFlyout,
        actionTypeRegistry: {
          has: (id: string) => id === '.github',
          get: () => ({ iconClass: 'logoGithub', selectMessage: 'Repos' }),
        },
      },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <ConnectSourcesGrid onConnected={onConnected} />
      </QueryClientProvider>
    </I18nProvider>
  );
  return { getAddConnectorFlyout, agents };
};

const githubCard = () => screen.findByRole('button', { name: /Type \.github/ });

describe('ConnectSourcesGrid', () => {
  it('renders a card per sandbox-capable type from the Nightshift API', async () => {
    setup({ types: [type('.github'), type('.http')] });

    await screen.findByTestId('nightshiftConnectSourcesGrid');
    expect(screen.getByTestId('.github-card')).toHaveTextContent('Type .github');
    expect(screen.getByTestId('.github-card')).toHaveTextContent('Repos');
    expect(screen.getByTestId('.http-card')).toHaveTextContent('Type .http');
  });

  it('opens the flyout preselected to the card type, then assigns the connector to the agent', async () => {
    const onConnected = jest.fn();
    const { getAddConnectorFlyout, agents } = setup({ types: [type('.github')], onConnected });

    fireEvent.click(await githubCard());

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    const props = (getAddConnectorFlyout.mock.calls as unknown as Array<[unknown]>)[0][0] as {
      initialConnector: { actionTypeId: string };
      onConnectorCreated: (connector: { id: string; name: string }) => void;
    };
    expect(props.initialConnector).toEqual({ actionTypeId: '.github' });
    props.onConnectorCreated({ id: 'gh', name: 'gh' });
    expect(onConnected).toHaveBeenCalled();
    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'gh',
      })
    );
  });

  it('disables the card when the license does not allow the type', async () => {
    setup({ types: [type('.github', { enabledInLicense: false })] });

    expect(await githubCard()).toBeDisabled();
  });

  it('shows an error with a retry when the connector types cannot be loaded', async () => {
    mockFetchConnectorTypes.mockRejectedValueOnce(forbiddenError());
    setup({ types: [type('.github')] });

    expect(await screen.findByTestId('nightshiftConnectSourcesError')).toHaveTextContent(
      'Could not load the connector types.'
    );
    expect(screen.queryByTestId('nightshiftConnectSourcesGrid')).not.toBeInTheDocument();

    const callsBeforeRetry = mockFetchConnectorTypes.mock.calls.length;
    fireEvent.click(screen.getByTestId('nightshiftConnectSourcesErrorRetry'));

    expect(await githubCard()).toBeInTheDocument();
    expect(mockFetchConnectorTypes).toHaveBeenCalledTimes(callsBeforeRetry + 1);
  });

  it('disables the card when the user cannot create connectors', async () => {
    setup({ types: [type('.github')], canSave: false });

    expect(await githubCard()).toBeDisabled();
  });

  it('disables the card when the user cannot edit the investigation agent', async () => {
    setup({ types: [type('.github')], canUpdateAgent: false });

    expect(await githubCard()).toBeDisabled();
  });
});
