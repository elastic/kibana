/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ConnectorSelector } from './connector_selector';

const testSubj = 'connector-selector';

describe('ConnectorSelector', () => {
  const mockOnChange = jest.fn();
  const mockOnNewConnectorClicked = jest.fn();

  const connectors = [
    { id: '1', name: 'Connector One', description: 'First test connector' },
    { id: '2', name: 'Connector Two', description: 'Second test connector' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with provided connectors', () => {
    const { getByTestId } = render(
      <ConnectorSelector connectors={connectors} onChange={mockOnChange} />
    );
    expect(getByTestId(testSubj)).toBeInTheDocument();
  });

  it('should call onChange when a connector is selected', () => {
    const { getByTestId } = render(
      <ConnectorSelector connectors={connectors} onChange={mockOnChange} />
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
      />
    );
    fireEvent.click(getByTestId(testSubj));
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });

  it('should call onNewConnectorClicked when add new connector is selected', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={connectors}
        onChange={mockOnChange}
        onNewConnectorClicked={mockOnNewConnectorClicked}
      />
    );
    fireEvent.click(getByTestId(testSubj));
    fireEvent.click(getByTestId('addNewConnectorButton'));
    expect(mockOnNewConnectorClicked).toHaveBeenCalled();
  });

  it('should disable selection when isDisabled is true', () => {
    const { getByTestId } = render(
      <ConnectorSelector connectors={connectors} onChange={mockOnChange} isDisabled />
    );
    expect(getByTestId(testSubj)).toBeDisabled();
  });

  it('should render a button to add a new connector when no connectors exist', () => {
    const { getByTestId } = render(
      <ConnectorSelector
        connectors={[]}
        onChange={mockOnChange}
        onNewConnectorClicked={mockOnNewConnectorClicked}
      />
    );
    expect(getByTestId('addNewConnectorButton')).toBeInTheDocument();
  });
});
