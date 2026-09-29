/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExecutiveSummary } from './executive_summary';

// Mocks for dependencies
vi.mock('./cost_savings', () => {
  const mocked = {
    CostSavings: () => <div data-test-subj="mockCostSavings" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./time_saved', () => {
  const mocked = { TimeSaved: () => <div data-test-subj="mockTimeSaved" /> };
  return { ...mocked, default: mocked };
});
vi.mock('./compare_percentage', () => {
  const mocked = {
    ComparePercentage: () => <div data-test-subj="mockComparePercentage" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./filtering_rate', () => {
  const mocked = {
    FilteringRate: () => <div data-test-subj="mockFilteringRate" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/user_profiles/use_get_current_user_profile', () => {
  const mocked = {
    useGetCurrentUserProfile: () => ({
      data: { user: { full_name: 'Test User', username: 'testuser' } },
    }),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/visualization_actions/visualization_embeddable', () => {
  const mocked = {
    VisualizationEmbeddable: () => <div data-test-subj="mockVisualizationEmbeddable" />,
  };
  return { ...mocked, default: mocked };
});
// Mock useKibana
vi.mock('@kbn/kibana-react-plugin/public', () => {
  const mocked = {
    useKibana: () => ({
      services: {
        settings: {
          client: {
            get: vi.fn(() => 'mock-connector-id'),
            set: vi.fn(),
          },
        },
      },
    }),
  };
  return { ...mocked, default: mocked };
});

const defaultProps = {
  attackAlertIds: ['alert-1', 'alert-2', 'alert-3'],
  from: '2023-01-01T00:00:00Z',
  to: '2023-01-31T23:59:59Z',
  isSample: false,
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
  it('renders main container, flex group, info, executive message and stats list, and side stats', () => {
    render(<ExecutiveSummary {...defaultProps} />);
    expect(screen.getByTestId('executiveSummaryContainer')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryFlexGroup')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryMainInfo')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummaryMessage').textContent).toContain('$1,000');
    expect(screen.getByTestId('executiveSummaryMessage').textContent).toContain('10');
    expect(screen.getByTestId('executiveSummarySideStats')).toBeInTheDocument();
    expect(screen.getByTestId('mockCostSavings')).toBeInTheDocument();
    expect(screen.getByTestId('mockTimeSaved')).toBeInTheDocument();
    expect(screen.getByTestId('mockFilteringRate')).toBeInTheDocument();
  });

  it('renders the same layout with sample data when isSample is true', () => {
    render(<ExecutiveSummary {...defaultProps} isSample={true} />);
    expect(screen.getByTestId('executiveSummaryContainer')).toBeInTheDocument();
    expect(screen.getByTestId('executiveSummarySideStats')).toBeInTheDocument();
    expect(screen.getByTestId('mockCostSavings')).toBeInTheDocument();
    expect(screen.getByTestId('mockTimeSaved')).toBeInTheDocument();
    expect(screen.getByTestId('mockFilteringRate')).toBeInTheDocument();
  });
});
