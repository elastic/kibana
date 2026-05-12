/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ConnectorSelector } from './connector_selector';
import type { ActionConnector as AiConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';

const testSubj = 'connector-selector';

describe('ConnectorSelector', () => {
  const mockOnChange = jest.fn();
  const mockOnNewConnectorClicked = jest.fn();

  const connectors = [
    { id: '1', name: 'Connector One', isPreconfigured: true },
    { id: '2', name: 'Connector Two', isPreconfigured: false },
  ] as unknown as AiConnector[];

  const mockSettings = {
    client: {
      get: jest.fn(),
    },
  } as unknown as SettingsStart;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with provided connectors', () => {
    const { getByTestId } = render(
      <ConnectorSelector connectors={connectors} onChange={mockOnChange} settings={mockSettings} />
    );
    expect(getByTestId(testSubj)).toBeInTheDocument();
  });

  it('should call onChange when a connector is selected', () => {
    const { getByTestId } = render(
      <ConnectorSelector connectors={connectors} onChange={mockOnChange} settings={mockSettings} />
    );

    fireEvent.click(getByTestId(testSubj));
    fireEvent.click(getByTestId('connector-option-Connector One'));

    expect(mockOnChange).toHaveBeenCalledWith('1');
  });

  it('should show the add new connector option when onNewConnectorClicked is provided', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={connectors}
        onChange={mockOnChange}
        onNewConnectorClicked={mockOnNewConnectorClicked}
        settings={mockSettings}
      />
    );
    fireEvent.click(getByTestId(testSubj));
    expect(getByTestId('aiAssistantAddConnectorButton')).toBeInTheDocument();
  });

  it('should call onNewConnectorClicked when add new connector is selected', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={connectors}
        onChange={mockOnChange}
        onNewConnectorClicked={mockOnNewConnectorClicked}
        settings={mockSettings}
      />
    );
    fireEvent.click(getByTestId(testSubj));
    fireEvent.click(getByTestId('aiAssistantAddConnectorButton'));
    expect(mockOnNewConnectorClicked).toHaveBeenCalled();
  });

  it('should disable selection when isDisabled is true', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={connectors}
        onChange={mockOnChange}
        isDisabled
        settings={mockSettings}
      />
    );
    expect(getByTestId(testSubj)).toBeDisabled();
  });

  it('should render a button to add a new connector when no connectors exist', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={[]}
        onChange={mockOnChange}
        onNewConnectorClicked={mockOnNewConnectorClicked}
        settings={mockSettings}
      />
    );
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });
});
