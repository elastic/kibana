/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import { ConnectTypeCard } from './connect_type_card';
import {
  actionType,
  mockKibanaServices,
  renderWithProviders,
  sandboxConnector,
} from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_connector', () => ({
  fetchConnector: jest.fn(),
}));
const mockFetchConnector = fetchConnector as jest.Mock;

const http = actionType('.http');
const connectors = [
  sandboxConnector('a'),
  sandboxConnector('b'),
  sandboxConnector('pre', { is_preconfigured: true }),
];

const setup = (options: Parameters<typeof mockKibanaServices>[0] = {}) => {
  const services = mockKibanaServices({ types: [http], connectors, assigned: ['a'], ...options });
  mockFetchConnector.mockResolvedValue({ id: 'b', actionTypeId: '.http', name: 'Connector b' });
  const group = {
    actionType: http,
    connectors: options.connectors ?? connectors,
    assignedCount: 1,
  };
  renderWithProviders(<ConnectTypeCard group={group} />);
  return services;
};

const openPopover = async () => {
  fireEvent.click(screen.getByTestId('.http-connect'));
  return screen.findByTestId('.http-connectPopover');
};

describe('ConnectTypeCard', () => {
  it('shows the type with the name and description of its registry model', () => {
    setup();

    expect(screen.getByTestId('.http-card')).toHaveTextContent('Type .http');
    expect(screen.getByTestId('.http-card')).toHaveTextContent('Send a request');
  });

  describe('without connectors of the type', () => {
    it('creates one from Connect and assigns it to the agent', async () => {
      const { getAddConnectorFlyout, agents } = setup({ connectors: [] });
      // Connect is locked until the agent's permissions are known.
      await waitFor(() => expect(screen.getByTestId('.http-connect')).toBeEnabled());

      fireEvent.click(screen.getByTestId('.http-connect'));

      expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
      const props = (getAddConnectorFlyout.mock.calls as unknown as Array<[unknown]>)[0][0] as {
        initialConnector: { actionTypeId: string };
        onConnectorCreated: (connector: { id: string; name: string }) => void;
      };
      expect(props.initialConnector).toEqual({ actionTypeId: '.http' });
      props.onConnectorCreated({ id: 'new', name: 'new' });
      await waitFor(() =>
        expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
          agentId: 'nightshift.investigation',
          connectorId: 'new',
        })
      );
    });
  });

  describe('with connectors of the type', () => {
    it('lists them in a popover, the assigned ones ticked', async () => {
      setup();

      await openPopover();

      await waitFor(() =>
        expect(screen.getByTestId('nightshiftConnectorListToggle-a')).toBeChecked()
      );
      expect(screen.getByTestId('nightshiftConnectorListToggle-b')).not.toBeChecked();
      expect(screen.getByTestId('nightshiftConnectorListItem-pre')).toHaveTextContent(
        'Preconfigured'
      );
    });

    it('assigns a ticked connector and keeps the popover open', async () => {
      const { agents } = setup();
      await openPopover();
      await waitFor(() =>
        expect(screen.getByTestId('nightshiftConnectorListToggle-b')).toBeEnabled()
      );

      fireEvent.click(screen.getByTestId('nightshiftConnectorListToggle-b'));

      await waitFor(() =>
        expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
          agentId: 'nightshift.investigation',
          connectorId: 'b',
        })
      );
      await waitFor(() =>
        expect(screen.getByTestId('nightshiftConnectorListToggle-b')).toBeChecked()
      );
      expect(screen.getByTestId('.http-connectPopover')).toBeInTheDocument();
    });

    it('opens the connector details in the edit flyout, outliving the popover', async () => {
      const { getEditConnectorFlyout } = setup();
      await openPopover();

      fireEvent.click(screen.getByTestId('nightshiftConnectorListOpenDetails-b'));

      expect(await screen.findByTestId('editConnectorFlyoutStub')).toBeInTheDocument();
      expect(mockFetchConnector).toHaveBeenCalledWith('b', expect.anything());
      expect(getEditConnectorFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ connector: expect.objectContaining({ id: 'b' }) })
      );
      await waitFor(() =>
        expect(screen.queryByTestId('.http-connectPopover')).not.toBeInTheDocument()
      );
    });

    it('deletes a connector after confirmation, taking it off the agent first', async () => {
      const { agents, http: httpClient } = setup();
      await openPopover();

      fireEvent.click(screen.getByTestId('nightshiftConnectorListDelete-a'));
      expect(await screen.findByTestId('nightshiftDeleteConnectorConfirm')).toHaveTextContent(
        'Delete Connector a?'
      );
      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      await waitFor(() =>
        expect(httpClient.delete).toHaveBeenCalledWith('/api/actions/connector/a')
      );
      expect(agents.removeConnectorFromAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'a',
      });
    });

    it('creates another connector of the type from the popover', async () => {
      const { getAddConnectorFlyout } = setup();
      await openPopover();

      fireEvent.click(screen.getByTestId('.http-create'));

      expect(await screen.findByTestId('addConnectorFlyoutStub')).toBeInTheDocument();
      expect(getAddConnectorFlyout).toHaveBeenCalledWith(
        expect.objectContaining({ initialConnector: { actionTypeId: '.http' } })
      );
    });

    it('locks Create connector without permission to create, but still lists', async () => {
      setup({ capabilities: { show: true, save: false, delete: true } });
      await openPopover();

      expect(screen.getByTestId('.http-create')).toBeDisabled();
      expect(screen.getByTestId('nightshiftConnectorListItem-a')).toBeInTheDocument();
    });
  });
});
