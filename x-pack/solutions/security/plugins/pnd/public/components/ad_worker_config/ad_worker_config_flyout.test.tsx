/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockUseLoadConnectors = jest.fn();

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: (...args: unknown[]) => mockUseLoadConnectors(...args),
}));

import { OpenAdWorkerConfigButton } from './open_ad_worker_config_button';

const services = {
  http: { get: jest.fn() },
  notifications: { toasts: { addError: jest.fn() } },
};

const renderButton = () =>
  render(
    <KibanaContextProvider services={services}>
      <OpenAdWorkerConfigButton />
    </KibanaContextProvider>
  );

describe('OpenAdWorkerConfigButton / AdWorkerConfigFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoadConnectors.mockReturnValue({
      data: [
        { id: 'connector-a', name: 'GPT-4o', actionTypeId: '.gen-ai' },
        { id: 'connector-b', name: 'Gemini', actionTypeId: '.gemini' },
      ],
      isLoading: false,
      soEntryFound: true,
    });
  });

  it('renders the button and does not show the flyout until clicked', () => {
    renderButton();

    expect(screen.getByTestId('openAdWorkerConfig')).toBeInTheDocument();
    expect(screen.queryByTestId('adWorkerConfigFlyout')).not.toBeInTheDocument();
  });

  it('opens the flyout with the three config sections and the inputs preview', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();
    expect(screen.getByText('Alert retrieval method')).toBeInTheDocument();
    expect(screen.getByText('Generation')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();

    const preview = screen.getByTestId('adWorkerConfigPreview');
    expect(preview).toHaveTextContent('"alert_retrieval_mode": "custom_query"');
    expect(preview).toHaveTextContent('"size": 100');
    expect(preview).toHaveTextContent('"validation_workflow_id": "default"');
  });

  it('loads connectors scoped to the attack_discovery feature using http from context', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'attack_discovery', http: services.http })
    );
  });

  it('hides the ES|QL editor in custom_query mode', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    expect(screen.queryByTestId('adWorkerEsqlQuery')).not.toBeInTheDocument();
  });

  it('reflects config edits in the inputs preview', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    fireEvent.change(screen.getByTestId('adWorkerSize'), { target: { value: '25' } });

    expect(screen.getByTestId('adWorkerConfigPreview')).toHaveTextContent('"size": 25');
  });

  it('lists the loaded connectors in the Generation selector', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    // EuiSuperSelect renders its options into a popover once opened.
    fireEvent.click(screen.getByTestId('adWorkerConnector'));

    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByText('GPT-4o')).toBeInTheDocument();
    expect(within(listbox).getByText('Gemini')).toBeInTheDocument();
  });

  it('closes the flyout via the footer button', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));
    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('adWorkerConfigClose'));

    expect(screen.queryByTestId('adWorkerConfigFlyout')).not.toBeInTheDocument();
  });
});
