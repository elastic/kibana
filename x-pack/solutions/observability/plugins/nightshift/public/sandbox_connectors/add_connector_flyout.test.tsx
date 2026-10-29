/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import { AddConnectorFlyout } from './add_connector_flyout';
import {
  actionType,
  httpError,
  mockKibanaServices,
  renderWithProviders,
  sandboxConnector,
} from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_connector', () => ({
  fetchConnector: jest.fn(),
}));
const mockFetchConnector = fetchConnector as jest.Mock;

const types = [actionType('.http'), actionType('.github')];
const connectors = [
  sandboxConnector('telemetry', { is_preconfigured: true }),
  sandboxConnector('h1'),
  sandboxConnector('h2'),
];

const setup = (options: Parameters<typeof mockKibanaServices>[0] = {}) => {
  const services = mockKibanaServices({
    types,
    connectors,
    assigned: ['telemetry', 'h1'],
    telemetryConnectorIds: ['telemetry'],
    ...options,
  });
  mockFetchConnector.mockResolvedValue({ id: 'h2', actionTypeId: '.http', name: 'Connector h2' });
  const onClose = jest.fn();
  renderWithProviders(<AddConnectorFlyout onClose={onClose} />);
  return { ...services, onClose };
};

describe('AddConnectorFlyout', () => {
  it('lists the sandbox-capable types with how many connectors each has, telemetry aside', async () => {
    setup();

    expect(await screen.findByTestId('.http-row')).toHaveTextContent('Type .http');
    expect(screen.getByTestId('.http-count')).toHaveTextContent('2 connectors');
    expect(screen.getByTestId('.github-count')).toHaveTextContent('No connectors');
    expect(screen.getByTestId('.github-row')).toHaveTextContent('No Type .github connectors');
  });

  it('shows the connectors of a type, the assigned ones ticked, and assigns a ticked one', async () => {
    const { agents } = setup();
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    await waitFor(() =>
      expect(screen.getByTestId('nightshiftConnectorListToggle-h1')).toBeChecked()
    );
    expect(screen.getByTestId('nightshiftConnectorListToggle-h2')).not.toBeChecked();
    expect(screen.queryByTestId('nightshiftConnectorListItem-telemetry')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftConnectorListToggle-h2'));

    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'h2',
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('nightshiftConnectorListToggle-h2')).toBeChecked()
    );
  });

  it('creates a connector of the type from Connect and assigns it to the agent', async () => {
    const { getAddConnectorFlyout, agents } = setup();
    await waitFor(() => expect(screen.getByTestId('.github-connect')).toBeEnabled());

    fireEvent.click(screen.getByTestId('.github-connect'));

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

  it('opens the connector details in the edit flyout', async () => {
    const { getEditConnectorFlyout } = setup();
    fireEvent.click(await screen.findByTestId('.http-toggle'));

    fireEvent.click(await screen.findByTestId('nightshiftConnectorListOpenDetails-h2'));

    expect(await screen.findByTestId('editConnectorFlyoutStub')).toBeInTheDocument();
    expect(getEditConnectorFlyout).toHaveBeenCalledWith(
      expect.objectContaining({ connector: expect.objectContaining({ id: 'h2' }) })
    );
  });

  it('locks Connect without permission to create connectors', async () => {
    setup({ capabilities: { show: true, save: false, delete: true } });

    expect(await screen.findByTestId('.github-connect')).toBeDisabled();
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
