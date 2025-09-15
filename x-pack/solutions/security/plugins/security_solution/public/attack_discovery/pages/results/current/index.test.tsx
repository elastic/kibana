/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { Current } from '.';
import { TestProviders } from '../../../../common/mock/test_providers';
import * as showEmptyStatesModule from '../empty_states/helpers/show_empty_states';
import * as helpersModule from '../../helpers';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';

// Helper to convert AttackDiscoveryAlert[] to AttackDiscovery[] (they are structurally compatible for test purposes)
const getMockAttackDiscoveries = () => {
  const alerts = getMockAttackDiscoveryAlerts();
  return alerts.map(
    ({
      alertIds,
      detailsMarkdown,
      summaryMarkdown,
      title,
      id,
      entitySummaryMarkdown,
      mitreAttackTactics,
      timestamp,
    }) => ({
      alertIds,
      detailsMarkdown,
      summaryMarkdown,
      title,
      id,
      entitySummaryMarkdown,
      mitreAttackTactics,
      timestamp,
    })
  );
};

const defaultProps = {
  aiConnectorsCount: 1,
  alertsContextCount: 1,
  alertsCount: 2,
  approximateFutureTime: null,
  attackDiscoveriesCount: 2,
  connectorId: 'test-connector',
  connectorIntervals: [],
  end: null,
  failureReason: null,
  isLoading: false,
  isLoadingPost: false,
  loadingConnectorId: null,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onGenerate: jest.fn(),
  onToggleShowAnonymized: jest.fn(),
  selectedConnectorAttackDiscoveries: getMockAttackDiscoveries(),
  selectedConnectorLastUpdated: null,
  selectedConnectorReplacements: {},
  showAnonymized: false,
  start: null,
  stats: null,
};

describe('Current', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(showEmptyStatesModule, 'showEmptyStates').mockReturnValue(false);
    jest.spyOn(helpersModule, 'showLoading').mockReturnValue(false);
  });

  it('renders the summary', async () => {
    await act(async () => {
      render(
        <TestProviders>
          <Current {...defaultProps} />
        </TestProviders>
      );
    });

    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('renders attack discovery panels for each alert', () => {
    render(
      <TestProviders>
        <Current {...defaultProps} />
      </TestProviders>
    );
    const alerts = defaultProps.selectedConnectorAttackDiscoveries;

    alerts.forEach((alert) => {
      expect(screen.getByTestId(`attackDiscoveryPanel-${alert.id}`)).toBeInTheDocument();
    });
  });

  it('renders empty states when showEmptyStates returns true', () => {
    jest.spyOn(showEmptyStatesModule, 'showEmptyStates').mockReturnValue(true);
    render(
      <TestProviders>
        <Current
          {...defaultProps}
          attackDiscoveriesCount={0}
          selectedConnectorAttackDiscoveries={[]}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('emptyStates')).toBeInTheDocument();
  });

  it('renders the loading callout when showLoading returns true', () => {
    jest.spyOn(helpersModule, 'showLoading').mockReturnValue(true);
    render(
      <TestProviders>
        <Current {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('loadingCallout')).toBeInTheDocument();
  });

  it('does not render the summary when attackDiscoveriesCount is 0', () => {
    render(
      <TestProviders>
        <Current {...defaultProps} attackDiscoveriesCount={0} />
      </TestProviders>
    );

    expect(screen.queryByTestId('summary')).not.toBeInTheDocument();
  });

  it('renders empty states when connectorId is undefined', () => {
    jest.spyOn(showEmptyStatesModule, 'showEmptyStates').mockReturnValue(true);
    render(
      <TestProviders>
        <Current
          {...defaultProps}
          connectorId={undefined}
          attackDiscoveriesCount={0}
          selectedConnectorAttackDiscoveries={[]}
          alertsContextCount={0}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('emptyStates')).toBeInTheDocument();
  });

  it('renders the failure when failureReason is set', () => {
    jest.spyOn(showEmptyStatesModule, 'showEmptyStates').mockReturnValue(true);
    render(
      <TestProviders>
        <Current
          {...defaultProps}
          failureReason={'Some error'}
          connectorId={'test-connector'}
          attackDiscoveriesCount={0}
          selectedConnectorAttackDiscoveries={[]}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('failure')).toBeInTheDocument();
  });
});
