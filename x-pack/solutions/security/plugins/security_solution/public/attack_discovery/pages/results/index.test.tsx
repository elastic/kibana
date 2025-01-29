/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../common/mock';
import { mockAttackDiscovery } from '../mock/mock_attack_discovery';
import { Results } from '.';

describe('Results', () => {
  const defaultProps = {
    aiConnectorsCount: 1,
    alertsContextCount: 100,
    alertsCount: 50,
    attackDiscoveriesCount: 1,
    connectorId: 'test-connector-id',
    failureReason: null,
    isLoading: false,
    isLoadingPost: false,
    localStorageAttackDiscoveryMaxAlerts: undefined,
    onGenerate: jest.fn(),
    onToggleShowAnonymized: jest.fn(),
    selectedConnectorAttackDiscoveries: [mockAttackDiscovery],
    selectedConnectorLastUpdated: new Date(),
    selectedConnectorReplacements: {},
    showAnonymized: false,
  };

  it('renders the EmptyStates when showEmptyStates returns true', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} aiConnectorsCount={0} />
      </TestProviders>
    );

    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('calls onGenerate when the generate button is clicked', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} alertsContextCount={0} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('generate'));

    expect(defaultProps.onGenerate).toHaveBeenCalled();
  });

  it('renders the Summary when showSummary returns true', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );
    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('calls onToggleShowAnonymized when the show anonymized toggle is clicked', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(screen.getByTestId('toggleAnonymized'));

    expect(defaultProps.onToggleShowAnonymized).toHaveBeenCalled();
  });

  it('renders a AttackDiscoveryPanel for the attack discovery', () => {
    render(
      <TestProviders>
        <Results {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('attackDiscovery')).toHaveLength(
      defaultProps.selectedConnectorAttackDiscoveries.length
    );
  });
});
