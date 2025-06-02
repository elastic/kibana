/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConnectorSelectorPanel } from './connector_selector_panel';
import type { AIConnector } from './types';

jest.mock('../../../../../../common/lib/kibana/kibana_react', () => ({
  useKibana: () => ({
    services: {
      triggersActionsUi: {
        actionTypeRegistry: {
          get: jest.fn(() => ({
            iconClass: 'testIconClass',
            name: 'Test Action Type',
          })),
        },
      },
    },
  }),
}));

describe('ConnectorSelectorPanel', () => {
  const defaultProps = {
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

  it('renders', () => {
    const { container } = render(<ConnectorSelectorPanel {...defaultProps} />);
    expect(container).toBeInTheDocument();
  });

  it('renders beta badge props when selected connector is a pre-configured connector', () => {
    const { getByTestId } = render(<ConnectorSelectorPanel {...defaultProps} />);
    expect(getByTestId('connectorSelectorPanelBetaBadge')).toBeInTheDocument();
  });

  it('does not render beta badge props when selected connector is not a pre-configured connector', () => {
    const testProps = {
      connectors: [
        {
          id: '.xxx',
          actionTypeId: '.xxx',
          isPreconfigured: true,
          name: 'LLM',
          config: {},
          isDeprecated: false,
          isSystemAction: false,
          secrets: {},
        },
      ] as AIConnector[],
      onConnectorSelected: jest.fn(),
      selectedConnectorId: '.test',
    };
    const { queryByTestId } = render(<ConnectorSelectorPanel {...testProps} />);
    expect(queryByTestId('connectorSelectorPanelBetaBadge')).not.toBeInTheDocument();
  });
});
