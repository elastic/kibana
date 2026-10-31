/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AddConnectorFlyout } from './add_connector_flyout';
import {
  actionType,
  httpError,
  mockKibanaServices,
  renderWithProviders,
  sandboxConnector,
} from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const types = [actionType('.http'), actionType('.github')];
const connectors = [
  sandboxConnector('h1', { name: 'acme-sre' }),
  sandboxConnector('h2', { name: 'acme-payments' }),
];

const setup = (options: Parameters<typeof mockKibanaServices>[0] = {}) => {
  const services = mockKibanaServices({
    types,
    connectors,
    assigned: ['h1'],
    ...options,
  });
  const onClose = jest.fn();
  renderWithProviders(<AddConnectorFlyout onClose={onClose} />);
  return { ...services, onClose };
};

describe('AddConnectorFlyout', () => {
  it('lists the sandbox-capable types with how many connectors each has', async () => {
    setup();

    expect(await screen.findByTestId('.http-row')).toHaveTextContent('Type .http');
    expect(screen.getByTestId('.http-count')).toHaveTextContent('2 connectors');
    expect(screen.getByTestId('.github-count')).toHaveTextContent('0 connectors');
  });

  it('shows the enabled connectors as such and enables another one', async () => {
    const { agents } = setup();
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    expect(await screen.findByTestId('nightshiftConnectorEnabled-h1')).toHaveTextContent('Enabled');
    expect(screen.getByTestId('nightshiftConnectorEnable-h2')).toHaveTextContent('Enable');

    fireEvent.click(screen.getByTestId('nightshiftConnectorEnable-h2'));

    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'h2',
      })
    );
    expect(await screen.findByTestId('nightshiftConnectorEnabled-h2')).toBeInTheDocument();
  });

  it('disables an enabled connector from its Enabled link', async () => {
    const { agents } = setup();
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    fireEvent.click(await screen.findByTestId('nightshiftConnectorEnabled-h1'));

    await waitFor(() =>
      expect(agents.removeConnectorFromAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'h1',
      })
    );
    expect(await screen.findByTestId('nightshiftConnectorEnable-h1')).toBeInTheDocument();
  });

  it('spins the clicked toggle while the agent updates', async () => {
    const { agents } = setup();
    let finishUpdate!: () => void;
    const addConnector = agents.addConnectorToAgent.getMockImplementation()!;
    agents.addConnectorToAgent.mockImplementationOnce(async (params) => {
      await new Promise<void>((resolve) => (finishUpdate = resolve));
      return addConnector(params);
    });
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    fireEvent.click(screen.getByTestId('nightshiftConnectorEnable-h2'));

    const clicked = await screen.findByTestId('nightshiftConnectorEnable-h2');
    await waitFor(() => expect(within(clicked).getByRole('progressbar')).toBeInTheDocument());
    expect(screen.getByTestId('nightshiftConnectorEnabled-h1')).toBeEnabled();

    finishUpdate();
    expect(await screen.findByTestId('nightshiftConnectorEnabled-h2')).toBeInTheDocument();
  });

  it('filters by connector name, counting the matches', async () => {
    setup();
    await screen.findByTestId('.http-row');

    fireEvent.change(screen.getByTestId('nightshiftAddConnectorFlyoutSearch'), {
      target: { value: 'payments' },
    });

    expect(screen.getByTestId('.http-count')).toHaveTextContent('1 connector');
    expect(screen.getByTestId('nightshiftConnectorRow-h2')).toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftConnectorRow-h1')).not.toBeInTheDocument();
  });

  it('keeps every connector of a type whose name matches the search', async () => {
    setup();
    await screen.findByTestId('.http-row');

    fireEvent.change(screen.getByTestId('nightshiftAddConnectorFlyoutSearch'), {
      target: { value: '.http' },
    });

    expect(screen.getByTestId('.http-count')).toHaveTextContent('2 connectors');
  });

  it('creates a connector of the type and assigns it to the agent', async () => {
    const { getAddConnectorFlyout, agents } = setup();
    await waitFor(() => expect(screen.getByTestId('.github-create')).toBeEnabled());

    fireEvent.click(screen.getByTestId('.github-create'));

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
    expect(screen.getByTestId('nightshiftAddConnectorFlyout')).toBeInTheDocument();
  });

  it('locks Create connector without permission to create connectors', async () => {
    setup({ capabilities: { show: true, save: false, delete: true } });

    expect(await screen.findByTestId('.github-create')).toBeDisabled();
  });

  it('locks Enable when the user cannot edit the agent', async () => {
    setup({ canUpdateAgent: false });
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    expect(await screen.findByTestId('nightshiftConnectorEnable-h2')).toBeDisabled();
  });

  it('shows an error with a retry when the connector types cannot be loaded', async () => {
    const { fetchConnectorTypes } = mockKibanaServices({ types, connectors });
    fetchConnectorTypes.mockRejectedValueOnce(httpError(403));
    renderWithProviders(<AddConnectorFlyout onClose={jest.fn()} />);

    expect(await screen.findByTestId('nightshiftAddConnectorFlyoutError')).toHaveTextContent(
      'Could not load the connector types.'
    );
    fireEvent.click(screen.getByTestId('nightshiftAddConnectorFlyoutErrorRetry'));

    expect(await screen.findByTestId('.http-row')).toBeInTheDocument();
  });
});
