/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { InfoPopoverBody } from '.';
import { TestProviders } from '../../../../common/mock';
import { AVERAGE_TIME } from '../countdown/translations';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { useKibanaFeatureFlags } from '../../use_kibana_feature_flags';

jest.mock('../../use_kibana_feature_flags');

const defaultProps = {
  connectorIntervals: [
    { date: '2024-05-16T14:13:09.838Z', durationMs: 173648 },
    { date: '2024-05-16T13:59:49.620Z', durationMs: 146605 },
    { date: '2024-05-16T13:47:00.629Z', durationMs: 255163 },
  ],
};

describe('InfoPopoverBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({
      attackDiscoveryAlertsEnabled: false,
    });
  });

  it('renders the expected average time', () => {
    render(
      <TestProviders>
        <InfoPopoverBody {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('191s');
  });

  it('renders the expected explanation', () => {
    render(
      <TestProviders>
        <InfoPopoverBody {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('averageTimeIsCalculated')[0]).toHaveTextContent(AVERAGE_TIME);
  });

  it('renders 0s when connectorIntervals is empty', () => {
    render(
      <TestProviders>
        <InfoPopoverBody connectorIntervals={[]} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('0s');
  });

  it('renders the correct average when attackDiscoveryAlertsEnabled is true and nanoseconds is provided', () => {
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({ attackDiscoveryAlertsEnabled: true });
    render(
      <TestProviders>
        <InfoPopoverBody {...defaultProps} averageSuccessfulDurationNanoseconds={8_500_000_000} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('9s');
  });

  it('renders 0s when attackDiscoveryAlertsEnabled is true and nanoseconds is undefined', () => {
    (useKibanaFeatureFlags as jest.Mock).mockReturnValue({ attackDiscoveryAlertsEnabled: true });
    render(
      <TestProviders>
        <InfoPopoverBody {...defaultProps} averageSuccessfulDurationNanoseconds={undefined} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('0s');
  });

  it('renders the LastTimesPopover with successfulGenerations', () => {
    render(
      <TestProviders>
        <InfoPopoverBody {...defaultProps} successfulGenerations={5} />
      </TestProviders>
    );

    expect(screen.getByTestId('lastTimesPopover')).toBeInTheDocument();
  });

  it('renders with attack discovery alert intervals', () => {
    const alerts = getMockAttackDiscoveryAlerts();
    const intervals = alerts.map((a, i) => ({
      date: `2024-05-16T14:13:0${i}.000Z`,
      durationMs: 1000 * (i + 1),
    }));

    render(
      <TestProviders>
        <InfoPopoverBody connectorIntervals={intervals} />
      </TestProviders>
    );

    expect(screen.getByTestId('averageTimeBadge')).toHaveTextContent('1s');
  });
});
