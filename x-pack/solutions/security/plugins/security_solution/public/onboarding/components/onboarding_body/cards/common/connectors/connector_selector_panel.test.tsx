/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorSelectorPanel } from './connector_selector_panel';
import type { AIConnector } from './types';

const mockConnectors: AIConnector[] = [
  {
    id: '1',
    name: 'Connector 1',
    actionTypeId: 'testType',
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    config: {},
    secrets: {},
  },
  {
    id: '2',
    name: 'Connector 2',
    actionTypeId: 'testType',
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: false,
    config: {},
    secrets: {},
  },
];

const mockActionTypeRegistry = {
  get: jest.fn(() => ({ iconClass: 'testIcon', name: 'Test Action' })),
};

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: { triggersActionsUi: { actionTypeRegistry: mockActionTypeRegistry } },
  }),
}));

describe('ConnectorSelectorPanel', () => {
  it('renders correctly', () => {
    render(<ConnectorSelectorPanel connectors={mockConnectors} onConnectorSelected={jest.fn()} />);
    expect(screen.getByText('Selected provider')).toBeInTheDocument();
  });

  it('preselects the only connector if there is one', () => {
    const onConnectorSelected = jest.fn();
    render(
      <ConnectorSelectorPanel
        connectors={[mockConnectors[0]]}
        onConnectorSelected={onConnectorSelected}
      />
    );
    expect(onConnectorSelected).toHaveBeenCalledWith(mockConnectors[0]);
  });

  it('calls onConnectorSelected when a connector is selected', async () => {
    const onConnectorSelected = jest.fn();
    render(
      <ConnectorSelectorPanel
        connectors={mockConnectors}
        onConnectorSelected={onConnectorSelected}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Connector Selector/i }));
    await userEvent.click(screen.getByText('Connector 2'));
    expect(onConnectorSelected).toHaveBeenCalledWith(mockConnectors[1]);
  });

  it('renders beta badge props when selected connector is a pre-configured connector', () => {
    const props = {
      connectors: [
        {
          id: '.inference',
          actionTypeId: '.inference',
          isPreconfigured: true,
          name: 'Elastic Managed LLM',
          config: {},
          isDeprecated: false,
          isSystemAction: false,
          secrets: {},
        },
      ] as AIConnector[],
      onConnectorSelected: jest.fn(),
      selectedConnectorId: '.inference',
    };
    const { getByTestId } = render(<ConnectorSelectorPanel {...props} />);
    expect(getByTestId('connectorSelectorPanelBetaBadge')).toBeInTheDocument();
  });
});
