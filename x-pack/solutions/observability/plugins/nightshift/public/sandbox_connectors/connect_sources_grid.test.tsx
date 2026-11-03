/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ActionType } from '@kbn/actions-types';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { ConnectSourcesGrid, type ConnectSourcesGroup } from './connect_sources_grid';
import {
  actionType,
  httpError,
  mockKibanaServices,
  renderWithProviders,
  sandboxConnector,
} from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const setup = ({
  types,
  connectors,
  group = 'additional',
  trailing,
  canSave = true,
  canUpdateAgent = true,
  typesError,
}: {
  types: ActionType[];
  connectors?: SandboxConnector[];
  group?: ConnectSourcesGroup;
  trailing?: React.ReactNode;
  canSave?: boolean;
  canUpdateAgent?: boolean;
  typesError?: Error;
}) => {
  const services = mockKibanaServices({
    types,
    connectors,
    capabilities: { save: canSave },
    canUpdateAgent,
  });
  if (typesError) services.fetchConnectorTypes.mockRejectedValueOnce(typesError);
  renderWithProviders(<ConnectSourcesGrid group={group} trailing={trailing} />);
  return services;
};

const githubCard = () => screen.findByRole('button', { name: /Type \.github/ });
const cardIds = () => screen.getAllByRole('listitem').map((card) => card.dataset.testSubj);

describe('ConnectSourcesGrid', () => {
  const allTypes = () => [
    actionType('.github'),
    actionType('.http'),
    actionType('.new_relic', { source: 'spec', name: 'New Relic', description: 'APM and more' }),
    actionType('.elasticsearch', {
      source: 'spec',
      name: 'External Elasticsearch',
      description: 'Search a remote cluster',
    }),
  ];

  it('shows External Elasticsearch and New Relic as the telemetry sources', async () => {
    setup({ types: allTypes(), group: 'telemetry' });

    await screen.findByTestId('nightshiftConnectSourcesGrid');
    expect(cardIds()).toEqual(['.new_relic-card', '.elasticsearch-card']);
    expect(screen.getByTestId('.new_relic-card')).toHaveTextContent('APM and more');
    expect(screen.getByTestId('.elasticsearch-card')).toHaveTextContent('External Elasticsearch');
  });

  it('shows HTTP and the other sandbox-capable types as additional sources', async () => {
    setup({ types: allTypes(), group: 'additional' });

    await screen.findByTestId('nightshiftConnectSourcesGrid');
    expect(cardIds()).toEqual(['.github-card', '.http-card']);
    expect(screen.getByTestId('.github-card')).toHaveTextContent('Repos');
  });

  it('lists every connector of the type in the HTTP card, preconfigured ones included', async () => {
    setup({
      types: [actionType('.http')],
      connectors: [
        sandboxConnector('telemetry', { name: 'Elasticsearch telemetry', is_preconfigured: true }),
        sandboxConnector('other'),
      ],
      group: 'additional',
    });

    fireEvent.click(await screen.findByTestId('.http-connect'));

    await screen.findByTestId('.http-connectPopover');
    expect(screen.getByTestId('nightshiftConnectorListItem-telemetry')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftConnectorListItem-other')).toBeInTheDocument();
  });

  it('ends the grid with the trailing card, even without a type to show', async () => {
    setup({ types: [], group: 'telemetry', trailing: <div data-test-subj="trailingCard" /> });

    expect(await screen.findByTestId('trailingCard')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftConnectSourcesGrid')).toBeInTheDocument();
  });

  it('opens the flyout preselected to the card type, then assigns the connector to the agent', async () => {
    const { getAddConnectorFlyout, agents } = setup({ types: [actionType('.github')] });

    fireEvent.click(await githubCard());

    expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
    const props = (getAddConnectorFlyout.mock.calls as unknown as Array<[unknown]>)[0][0] as {
      initialConnector: { actionTypeId: string };
      onConnectorCreated: (connector: { id: string; name: string }) => void;
    };
    expect(props.initialConnector).toEqual({ actionTypeId: '.github' });
    props.onConnectorCreated({ id: 'gh', name: 'gh' });
    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'gh',
      })
    );
  });

  it('disables the card when the license does not allow the type', async () => {
    setup({ types: [actionType('.github', { enabledInLicense: false })] });

    expect(await githubCard()).toBeDisabled();
  });

  it('shows an error with a retry when the connector types cannot be loaded', async () => {
    const { fetchConnectorTypes } = setup({
      types: [actionType('.github')],
      typesError: httpError(403),
    });

    expect(await screen.findByTestId('nightshiftConnectSourcesError')).toHaveTextContent(
      'Could not load the connector types.'
    );
    expect(screen.queryByTestId('nightshiftConnectSourcesGrid')).not.toBeInTheDocument();

    const callsBeforeRetry = fetchConnectorTypes.mock.calls.length;
    fireEvent.click(screen.getByTestId('nightshiftConnectSourcesErrorRetry'));

    expect(await githubCard()).toBeInTheDocument();
    expect(fetchConnectorTypes).toHaveBeenCalledTimes(callsBeforeRetry + 1);
  });

  it('disables the card when the user cannot create connectors', async () => {
    setup({ types: [actionType('.github')], canSave: false });

    expect(await githubCard()).toBeDisabled();
  });

  it('disables the card when the user cannot edit the investigation agent', async () => {
    setup({ types: [actionType('.github')], canUpdateAgent: false });

    expect(await githubCard()).toBeDisabled();
  });

  it('renders nothing when the group has no type and nothing trails', async () => {
    setup({ types: [actionType('.github')], group: 'telemetry' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId('nightshiftConnectSourcesGrid')).not.toBeInTheDocument();
  });
});
