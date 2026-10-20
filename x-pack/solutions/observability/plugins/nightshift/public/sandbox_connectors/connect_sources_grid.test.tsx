/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ActionType } from '@kbn/actions-types';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';
import { useKibana } from '../hooks/use_kibana';
import { ConnectSourcesGrid } from './connect_sources_grid';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types', () => ({
  fetchConnectorTypes: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockFetchConnectorTypes = fetchConnectorTypes as jest.Mock;

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

const setup = ({
  types,
  canSave = true,
  onConnected,
}: {
  types: ActionType[];
  canSave?: boolean;
  onConnected?: () => void;
}) => {
  mockFetchConnectorTypes.mockResolvedValue(types);
  const getAddConnectorFlyout = jest.fn(() => <div data-test-subj="addConnectorFlyoutStub" />);
  mockUseKibana.mockReturnValue({
    services: {
      http: {},
      application: { capabilities: { actions: { save: canSave } } },
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
  return { getAddConnectorFlyout };
};

const githubCard = () => screen.findByRole('button', { name: /Type \.github/ });

describe('ConnectSourcesGrid', () => {
  it('asks for sandbox-capable types only and renders the flyout card per type', async () => {
    setup({ types: [type('.github'), type('.http')] });

    await screen.findByTestId('nightshiftConnectSourcesGrid');
    expect(mockFetchConnectorTypes).toHaveBeenCalledWith(
      expect.objectContaining({ sandboxCapableOnly: true })
    );
    // Same card as the connector flyout's "Select a connector" step: `${id}-card`.
    expect(screen.getByTestId('.github-card')).toHaveTextContent('Type .github');
    expect(screen.getByTestId('.github-card')).toHaveTextContent('Repos');
    expect(screen.getByTestId('.http-card')).toHaveTextContent('Type .http');
  });

  it('opens the connector flyout preselected to the card type and reports the connect', async () => {
    const onConnected = jest.fn();
    const { getAddConnectorFlyout } = setup({ types: [type('.github')], onConnected });

    fireEvent.click(await githubCard());

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    const props = (getAddConnectorFlyout.mock.calls as unknown as Array<[unknown]>)[0][0] as {
      initialConnector: { actionTypeId: string };
      onConnectorCreated: () => void;
    };
    expect(props.initialConnector).toEqual({ actionTypeId: '.github' });
    props.onConnectorCreated();
    expect(onConnected).toHaveBeenCalled();
  });

  it('disables the card when the license does not allow the type', async () => {
    setup({ types: [type('.github', { enabledInLicense: false })] });

    expect(await githubCard()).toBeDisabled();
  });

  it('disables the card when the user cannot create connectors', async () => {
    setup({ types: [type('.github')], canSave: false });

    expect(await githubCard()).toBeDisabled();
  });

  it('renders nothing when no type is sandbox capable', async () => {
    setup({ types: [] });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('nightshiftConnectSourcesGrid')).not.toBeInTheDocument();
  });
});
