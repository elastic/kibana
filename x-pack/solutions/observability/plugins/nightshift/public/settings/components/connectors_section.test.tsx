/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { ConnectorsSection } from './connectors_section';
import {
  actionType,
  mockKibanaServices,
  renderWithProviders,
  sandboxConnector,
} from '../../sandbox_connectors/test_utils';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));

const setup = (options: Parameters<typeof mockKibanaServices>[0] = {}) => {
  const services = mockKibanaServices({
    types: [actionType('.http')],
    connectors: [sandboxConnector('h1')],
    assigned: ['h1'],
    ...options,
  });
  renderWithProviders(<ConnectorsSection />);
  return services;
};

describe('ConnectorsSection', () => {
  it('lists the assigned connectors and opens the add flyout', async () => {
    setup();

    expect(await screen.findByTestId('nightshiftSandboxConnectorsTable')).toHaveTextContent(
      'Connector h1'
    );
    fireEvent.click(await screen.findByTestId('nightshiftAddConnectorButton'));

    expect(await screen.findByTestId('nightshiftAddConnectorFlyout')).toBeInTheDocument();
    expect(await screen.findByTestId('.http-row')).toBeInTheDocument();
  });

  it('offers no Add connector without full connector privileges', async () => {
    setup({ capabilities: { show: true, save: true, delete: false, execute: true } });

    await screen.findByTestId('nightshiftSandboxConnectorsTable');
    expect(screen.queryByTestId('nightshiftAddConnectorButton')).not.toBeInTheDocument();
  });

  it('offers no Add connector when the user cannot edit the agent', async () => {
    setup({ canUpdateAgent: false });

    await screen.findByTestId('nightshiftSandboxConnectorsTable');
    expect(screen.queryByTestId('nightshiftAddConnectorButton')).not.toBeInTheDocument();
  });
});
