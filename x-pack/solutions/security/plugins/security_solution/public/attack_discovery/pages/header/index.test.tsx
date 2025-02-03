/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { TestProviders } from '../../../common/mock';
import { Header } from '.';

jest.mock('../../../assistant/use_assistant_availability');

jest.mock('@kbn/elastic-assistant-common', () => {
  const original = jest.requireActual('@kbn/elastic-assistant-common');

  return {
    ...original,
    defaultAssistantFeatures: {
      ...original.defaultAssistantFeatures,
      attackDiscoveryAlertFiltering: jest.mocked<boolean>(false), // <-- feature flag is off by default
    },
  };
});

const defaultProps = {
  stats: null,
  connectorId: 'testConnectorId',
  connectorsAreConfigured: true,
  isDisabledActions: false,
  isLoading: false,
  localStorageAttackDiscoveryMaxAlerts: `${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`,
  onCancel: jest.fn(),
  onGenerate: jest.fn(),
  onConnectorIdSelected: jest.fn(),
  openFlyout: jest.fn(),
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
};

describe('Actions', () => {
  beforeEach(() => {
    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: true,
      isAssistantEnabled: true,
    });

    jest.clearAllMocks();
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = false; // reset feature flag to off
  });

  it('renders the connector selector', () => {
    render(
      <TestProviders>
        <Header {...defaultProps} />
      </TestProviders>
    );

    const connectorSelector = screen.getByTestId('addNewConnectorButton');

    expect(connectorSelector).toBeInTheDocument();
  });

  it('does NOT render the connector selector when connectors are NOT configured', () => {
    const connectorsAreConfigured = false;

    render(
      <TestProviders>
        <Header {...defaultProps} connectorsAreConfigured={connectorsAreConfigured} />
      </TestProviders>
    );

    const connectorSelector = screen.queryByTestId('addNewConnectorButton');

    expect(connectorSelector).not.toBeInTheDocument();
  });

  it('invokes onGenerate when the generate button is clicked', () => {
    const onGenerate = jest.fn();

    render(
      <TestProviders>
        <Header {...defaultProps} onGenerate={onGenerate} />
      </TestProviders>
    );

    const generate = screen.getByTestId('generate');

    fireEvent.click(generate);

    expect(onGenerate).toHaveBeenCalled();
  });

  it('displays the cancel button when loading', () => {
    const isLoading = true;

    render(
      <TestProviders>
        <Header {...defaultProps} isLoading={isLoading} />
      </TestProviders>
    );

    const cancel = screen.getByTestId('cancel');

    expect(cancel).toBeInTheDocument();
  });

  it('invokes onCancel when the cancel button is clicked', () => {
    const isLoading = true;
    const onCancel = jest.fn();

    render(
      <TestProviders>
        <Header {...defaultProps} isLoading={isLoading} onCancel={onCancel} />
      </TestProviders>
    );

    const cancel = screen.getByTestId('cancel');
    fireEvent.click(cancel);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables the generate button when connectorId is undefined', () => {
    const connectorId = undefined;

    render(
      <TestProviders>
        <Header {...defaultProps} connectorId={connectorId} />
      </TestProviders>
    );

    const generate = screen.getByTestId('generate');

    expect(generate).toBeDisabled();
  });

  it('invokes openFlyout when the settings button is clicked, when the attackDiscoveryAlertFiltering feature flag is on', async () => {
    (defaultAssistantFeatures.attackDiscoveryAlertFiltering as jest.Mocked<boolean>) = true;
    const openFlyout = jest.fn();

    render(
      <TestProviders>
        <Header {...defaultProps} openFlyout={openFlyout} />
      </TestProviders>
    );

    const settings = screen.getByTestId('openAlertSelection');
    fireEvent.click(settings);

    await waitFor(() => expect(openFlyout).toHaveBeenCalled());
  });
});
