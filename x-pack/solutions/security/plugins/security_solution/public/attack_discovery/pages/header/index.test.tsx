/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '@kbn/elastic-assistant';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useAssistantAvailability } from '../../../assistant/use_assistant_availability';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { Header } from '.';
import { useSpaceId } from '../../../common/hooks/use_space_id';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../assistant/use_assistant_availability');
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

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
  showFlyout: false,
};

describe('Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useSpaceId as jest.Mock).mockReturnValue('default');

    (useAssistantAvailability as jest.Mock).mockReturnValue({
      hasAssistantPrivilege: true,
      isAssistantEnabled: true,
      isAssistantVisible: true,
    });

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(true),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);
  });

  it('renders the connector selector when the feature flag is false', () => {
    const featureFlagValue = false;

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(featureFlagValue),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    render(
      <TestProviders>
        <Header {...defaultProps} />
      </TestProviders>
    );

    const connectorSelector = screen.getByTestId('addNewConnectorButton');

    expect(connectorSelector).toBeInTheDocument();
  });

  it('does NOT render the connector selector when the feature flag is true', () => {
    render(
      <TestProviders>
        <Header {...defaultProps} />
      </TestProviders>
    );

    const connectorSelector = screen.queryByTestId('addNewConnectorButton');

    expect(connectorSelector).not.toBeInTheDocument();
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

  it('displays the cancel button when loading and the feature flag is false', () => {
    const isLoading = true;
    const featureFlagValue = false;

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(featureFlagValue),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    render(
      <TestProviders>
        <Header {...defaultProps} isLoading={isLoading} />
      </TestProviders>
    );

    const cancel = screen.getByTestId('cancel');

    expect(cancel).toBeInTheDocument();
  });

  it('does NOT display the cancel button when loading and the feature flag is true', () => {
    const isLoading = true;
    const featureFlagValue = true;

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(featureFlagValue),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    render(
      <TestProviders>
        <Header {...defaultProps} isLoading={isLoading} />
      </TestProviders>
    );

    const cancel = screen.queryByTestId('cancel');

    expect(cancel).not.toBeInTheDocument();
  });

  it('invokes onCancel when the cancel button is clicked', () => {
    const isLoading = true;
    const featureFlagValue = false;

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: jest.fn().mockReturnValue(featureFlagValue),
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

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

  it('invokes openFlyout when the settings button is clicked', async () => {
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
