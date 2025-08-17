/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExecutiveSummary } from './executive_summary';

// Mocks for dependencies
jest.mock('./cost_savings', () => ({
  CostSavings: () => <div data-test-subj="mockCostSavings" />,
}));
jest.mock('./time_saved', () => ({ TimeSaved: () => <div data-test-subj="mockTimeSaved" /> }));
jest.mock('./compare_percentage', () => ({
  ComparePercentage: () => <div data-test-subj="mockComparePercentage" />,
}));
jest.mock('../../../common/components/user_profiles/use_get_current_user_profile', () => ({
  useGetCurrentUserProfile: () => ({
    data: { user: { full_name: 'Test User', username: 'testuser' } },
  }),
}));

const defaultProps = {
  from: '2023-01-01T00:00:00Z',
  to: '2023-01-31T23:59:59Z',
  hasAttackDiscoveries: true,
  valueMetrics: {
    costSavings: 1000,
    costSavingsCompare: 800,
    filteredAlerts: 50,
    filteredAlertsPerc: 0.5,
    escalatedAlertsPerc: 0.5,
    hoursSaved: 10,
    totalAlerts: 150,
    attackDiscoveryCount: 5,
  },
  valueMetricsCompare: {
    costSavings: 800,
    costSavingsCompare: 600,
    filteredAlerts: 40,
    filteredAlertsPerc: 0.4,
    escalatedAlertsPerc: 0.6,
    hoursSaved: 8,
    totalAlerts: 150,
    attackDiscoveryCount: 3,
  },
  minutesPerAlert: 5,
  analystHourlyRate: 100,
};

describe('ExecutiveSummary', () => {
  it('renders main container and flex group', () => {
    render(<ExecutiveSummary {...defaultProps} />);
    expect(screen.getByTestId('executiveSummaryContainer')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryFlexGroup')).toBeInTheDocument();
  });

  it('renders greeting and main info', () => {
    render(<ExecutiveSummary {...defaultProps} />);
    expect(screen.getByTestId('executiveSummaryGreeting').textContent).toContain('Test User');
    expect(screen.getByTestId('executiveSummaryMainInfo')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryGreetingGroup')).toBeInTheDocument();
  });

  it('renders executive message and stats list when hasAttackDiscoveries is true', () => {
    render(<ExecutiveSummary {...defaultProps} />);
    expect(screen.getByTestId('executiveSummaryMessage').textContent).toContain('$1,000');
    expect(screen.getByTestId('executiveSummaryMessage').textContent).toContain('10');
    expect(screen.getByTestId('executiveSummaryStatsList')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryCostSavingsStat').textContent).toContain('$1,000');
    expect(screen.getByTestId('executiveSummaryAlertFilteringStat').textContent).toContain('50%');
    expect(screen.getByTestId('executiveSummaryHoursSavedStat').textContent).toContain('10');
    expect(screen.getByTestId('executiveSummaryThreatsDetectedStat').textContent).toContain(
      '66.7% increase in real threats detected, improving detection coverage. '
    );
  });

  it('renders side stats when hasAttackDiscoveries is true', () => {
    render(<ExecutiveSummary {...defaultProps} />);
    expect(screen.getByTestId('executiveSummarySideStats')).toBeInTheDocument();
    expect(screen.getByTestId('mockCostSavings')).toBeInTheDocument();
    expect(screen.getByTestId('mockTimeSaved')).toBeInTheDocument();
  });

  it('renders no attacks message when hasAttackDiscoveries is false', () => {
    render(<ExecutiveSummary {...defaultProps} hasAttackDiscoveries={false} />);
    expect(screen.getByTestId('executiveSummaryNoAttacks').textContent).toMatch(
      /no attack discoveries/i
    );
    expect(screen.queryByTestId('executiveSummaryStatsList')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveSummarySideStats')).not.toBeInTheDocument();
  });
});
