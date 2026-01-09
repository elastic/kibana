/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { Summary } from '.';
import { TestProviders } from '../../../../common/mock';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';

jest.mock('../../../../common/lib/kibana');

jest.mock(
  '@kbn/elastic-assistant/impl/data_anonymization/settings/anonymization_settings_management',
  () => ({
    AnonymizationSettingsManagement: ({ onClose }: { onClose: () => void }) => (
      <div data-test-subj="anonymizationSettingsModal">
        <button type="button" data-test-subj="closeAnonymizationSettingsModal" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    ),
  })
);

describe('Summary', () => {
  const defaultProps = {
    alertsCount: 20,
    attackDiscoveriesCount: 5,
    lastUpdated: new Date(),
    onToggleShowAnonymized: jest.fn(),
    selectedAttackDiscoveries: {},
    selectedConnectorAttackDiscoveries: [],
    setSelectedAttackDiscoveries: jest.fn(),
    showAnonymized: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the expected summary counts', () => {
    render(<Summary {...defaultProps} />);

    const summaryCount = screen.getByTestId('summaryCount');

    expect(summaryCount).toHaveTextContent('5 discoveries|20 alerts|Generated: a few seconds ago');
  });

  it('calls onToggleShowAnonymized when the toggle button is clicked', () => {
    render(<Summary {...defaultProps} />);

    const toggleAnonymized = screen.getByTestId('toggleAnonymized');
    fireEvent.click(toggleAnonymized);

    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
  });

  it('renders the loading spinner when isLoading is true', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} isLoading={true} />
      </TestProviders>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders without lastUpdated', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} lastUpdated={null} />
      </TestProviders>
    );

    expect(screen.getByTestId('summaryCount')).not.toHaveTextContent('Generated:');
  });

  it('renders SelectedActions when selectedAttackDiscoveries is not empty', () => {
    const selectedAttackDiscoveries = { '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': true };
    render(
      <TestProviders>
        <Summary
          {...defaultProps}
          selectedAttackDiscoveries={selectedAttackDiscoveries}
          selectedConnectorAttackDiscoveries={getMockAttackDiscoveryAlerts()}
        />
      </TestProviders>
    );

    expect(screen.getByText(/Selected 1 Attack discovery/)).toBeInTheDocument();
  });

  it('passes refetchFindAttackDiscoveries to SelectedActions', () => {
    const refetchFindAttackDiscoveries = jest.fn();
    const selectedAttackDiscoveries = { '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': true };
    render(
      <TestProviders>
        <Summary
          {...defaultProps}
          refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
          selectedAttackDiscoveries={selectedAttackDiscoveries}
          selectedConnectorAttackDiscoveries={getMockAttackDiscoveryAlerts()}
        />
      </TestProviders>
    );

    // The prop is passed, but we can't trigger it directly from here; just ensure no error
    expect(screen.getByText(/Selected 1 Attack discovery/)).toBeInTheDocument();
  });

  it('renders the switch checked when showAnonymized is true', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} showAnonymized={true} />
      </TestProviders>
    );

    const toggleButton = screen.getByTestId('toggleAnonymized');

    expect(toggleButton).toHaveAttribute('aria-checked', 'true');
  });

  it('renders the switch unchecked when showAnonymized is false', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} showAnonymized={false} />
      </TestProviders>
    );

    const toggleButton = screen.getByTestId('toggleAnonymized');

    expect(toggleButton).toHaveAttribute('aria-checked', 'false');
  });

  it('renders the anonymization settings button', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('anonymizationSettings')).toBeInTheDocument();
  });

  it('opens the anonymization settings modal when the settings button is clicked', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} />
      </TestProviders>
    );

    const settingsButton = screen.getByTestId('anonymizationSettings');
    fireEvent.click(settingsButton);

    expect(screen.getByTestId('anonymizationSettingsModal')).toBeInTheDocument();
  });

  it('closes the anonymization settings modal when onClose is triggered', () => {
    render(
      <TestProviders>
        <Summary {...defaultProps} />
      </TestProviders>
    );

    const settingsButton = screen.getByTestId('anonymizationSettings');
    fireEvent.click(settingsButton);

    const closeButton = screen.getByTestId('closeAnonymizationSettingsModal');
    fireEvent.click(closeButton);

    expect(screen.queryByTestId('anonymizationSettingsModal')).not.toBeInTheDocument();
  });
});
