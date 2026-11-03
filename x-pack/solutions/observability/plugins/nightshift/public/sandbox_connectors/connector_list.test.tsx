/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ConnectorList } from './connector_list';
import { mockKibanaServices, renderWithProviders, sandboxConnector } from './test_utils';

jest.mock('../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const connectors = [
  sandboxConnector('a'),
  sandboxConnector('b'),
  sandboxConnector('pre', { is_preconfigured: true }),
];

const toggle = (id: string) => screen.getByTestId(`nightshiftConnectorListToggle-${id}`);

/** Renders the list with connector `a` assigned to the agent and waits for the agent to load. */
const setup = async ({
  canOpenDetails = true,
  canDelete = true,
  ...services
}: Parameters<typeof mockKibanaServices>[0] & {
  canOpenDetails?: boolean;
  canDelete?: boolean;
} = {}) => {
  const mocks = mockKibanaServices({ connectors, assigned: ['a'], ...services });
  const onOpenDetails = jest.fn();
  const onDelete = jest.fn();
  renderWithProviders(
    <ConnectorList
      connectors={connectors}
      canOpenDetails={canOpenDetails}
      onOpenDetails={onOpenDetails}
      canDelete={canDelete}
      onDelete={onDelete}
      data-test-subj="list"
    />
  );
  await waitFor(() => expect(toggle('a')).toBeChecked());
  return { ...mocks, onOpenDetails, onDelete };
};

describe('ConnectorList', () => {
  it('ticks the connectors the agent has and marks preconfigured ones', async () => {
    await setup();

    expect(toggle('a')).toBeChecked();
    expect(toggle('b')).not.toBeChecked();
    expect(screen.getByTestId('nightshiftConnectorListItem-pre')).toHaveTextContent(
      'Preconfigured'
    );
  });

  it('assigns a connector to the agent when ticked, and removes it when unticked', async () => {
    const { agents, toasts } = await setup();

    fireEvent.click(toggle('b'));
    await waitFor(() =>
      expect(agents.addConnectorToAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'b',
      })
    );
    await waitFor(() => expect(toggle('b')).toBeChecked());
    expect(toasts.addSuccess).toHaveBeenCalledWith({ title: 'Connector b added' });

    fireEvent.click(toggle('a'));
    await waitFor(() =>
      expect(agents.removeConnectorFromAgent).toHaveBeenCalledWith({
        agentId: 'nightshift.investigation',
        connectorId: 'a',
      })
    );
    await waitFor(() => expect(toggle('a')).not.toBeChecked());
  });

  it('hands details and delete to the parent with the connector', async () => {
    const { onOpenDetails, onDelete } = await setup();

    fireEvent.click(screen.getByTestId('nightshiftConnectorListOpenDetails-b'));
    expect(onOpenDetails).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));

    fireEvent.click(screen.getByTestId('nightshiftConnectorListDelete-a'));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('locks details and delete for preconfigured connectors', async () => {
    await setup();

    expect(screen.getByTestId('nightshiftConnectorListOpenDetails-pre')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorListDelete-pre')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorListOpenDetails-a')).toBeEnabled();
    expect(screen.getByTestId('nightshiftConnectorListDelete-a')).toBeEnabled();
  });

  it('locks the checkbox and delete when the user cannot edit the agent', async () => {
    await setup({ canUpdateAgent: false });

    expect(toggle('a')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorListDelete-a')).toBeDisabled();
  });

  it('locks details and delete without the connector privileges', async () => {
    await setup({ canOpenDetails: false, canDelete: false });

    expect(screen.getByTestId('nightshiftConnectorListOpenDetails-a')).toBeDisabled();
    expect(screen.getByTestId('nightshiftConnectorListDelete-a')).toBeDisabled();
    expect(toggle('a')).toBeEnabled();
  });
});
