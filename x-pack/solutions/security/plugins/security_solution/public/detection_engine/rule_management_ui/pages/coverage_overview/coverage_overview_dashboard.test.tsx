/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview_query';

import { getMockCoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewDashboard } from './coverage_overview_dashboard';
import { CoverageOverviewDashboardContextProvider } from './coverage_overview_dashboard_context';

jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../rule_management/api/hooks/use_fetch_coverage_overview_query');
jest.mock('../../../../common/hooks/mitre/use_mitre_configuration', () => ({
  useMitreConfiguration: () => ({ frameworkVersion: '16.1' }),
}));

// The invalid MITRE rules callout is gated behind the mitreAttackUpdatesUIEnabled
// feature flag, which is off by default. Force it on for this test suite.
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const renderCoverageOverviewDashboard = () => {
  return render(
    <TestProviders>
      <CoverageOverviewDashboardContextProvider>
        <CoverageOverviewDashboard />
      </CoverageOverviewDashboardContextProvider>
    </TestProviders>
  );
};

describe('CoverageOverviewDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
      data: getMockCoverageOverviewDashboard(),
      isLoading: false,
      isMitreError: false,
      refetch: jest.fn(),
    });
  });

  test('it renders', () => {
    renderCoverageOverviewDashboard();
    expect(useFetchCoverageOverviewQuery).toHaveBeenCalled();
  });

  test('does NOT render the invalid MITRE rules callout when there are no invalidly mapped rules', () => {
    renderCoverageOverviewDashboard();

    expect(
      screen.queryByTestId('coverageOverviewInvalidMitreRulesCallout')
    ).not.toBeInTheDocument();
  });

  test('renders the invalid MITRE rules callout when there are invalidly mapped rules', () => {
    const mockDashboard = getMockCoverageOverviewDashboard();
    mockDashboard.invalidlyMappedRules.enabledRules = [
      {
        id: 'rule-2',
        name: 'Rule with bad MITRE',
        invalidMitreIds: ['TA9999'],
      },
    ];

    (useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
      data: mockDashboard,
      isLoading: false,
      isMitreError: false,
      refetch: jest.fn(),
    });

    renderCoverageOverviewDashboard();

    expect(screen.getByTestId('coverageOverviewInvalidMitreRulesCallout')).toBeInTheDocument();
  });

  test('shows a loading spinner while isLoading is true', () => {
    (useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isMitreError: false,
      refetch: jest.fn(),
    });

    renderCoverageOverviewDashboard();

    expect(screen.getByTestId('coverageOverviewLoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('coverageOverviewMitreErrorCallout')).not.toBeInTheDocument();
  });

  test('shows a MITRE error callout when isMitreError is true and loading is false', () => {
    (useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isMitreError: true,
      refetch: jest.fn(),
    });

    renderCoverageOverviewDashboard();

    expect(screen.getByTestId('coverageOverviewMitreErrorCallout')).toBeInTheDocument();
    expect(screen.queryByTestId('coverageOverviewLoadingSpinner')).not.toBeInTheDocument();
  });

  test('does NOT show error callout when MITRE data loads successfully', () => {
    renderCoverageOverviewDashboard();

    expect(screen.queryByTestId('coverageOverviewMitreErrorCallout')).not.toBeInTheDocument();
  });
});
