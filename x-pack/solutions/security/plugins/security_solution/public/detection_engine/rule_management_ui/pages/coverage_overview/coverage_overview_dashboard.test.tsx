/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useFetchCoverageOverviewQuery } from '../../../rule_management/api/hooks/use_fetch_coverage_overview_query';

import { getMockCoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewDashboard } from './coverage_overview_dashboard';
import { CoverageOverviewDashboardContextProvider } from './coverage_overview_dashboard_context';

jest.mock('../../../../common/utils/route/spy_routes', () => ({ SpyRoute: () => null }));
jest.mock('../../../rule_management/api/hooks/use_fetch_coverage_overview_query');

// The invalid MITRE rules callout is gated behind the mitreAttackUpdatesUIEnabled
// feature flag, which is off by default. Force it on for this test suite.
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockUseAvailableMitreFrameworks = jest.fn();
jest.mock('../../../../common/hooks/mitre/use_available_mitre_frameworks', () => ({
  useAvailableMitreFrameworks: () => mockUseAvailableMitreFrameworks(),
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
    mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise', 'atlas']);
    (useFetchCoverageOverviewQuery as jest.Mock).mockReturnValue({
      data: getMockCoverageOverviewDashboard(),
      isLoading: false,
      isMitreError: false,
      frameworkVersion: '16.1',
      refetch: jest.fn(),
    });
  });

  test('renders the page title', () => {
    renderCoverageOverviewDashboard();
    expect(screen.getByText('MITRE coverage')).toBeInTheDocument();
  });

  test('renders both framework tabs with MITRE ATT&CK selected', () => {
    renderCoverageOverviewDashboard();

    expect(screen.getByTestId('coverageOverviewFrameworkTabs')).toBeInTheDocument();
    expect(screen.getByTestId('coverageOverviewFrameworkTab-enterprise')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-enterprise')).toHaveTextContent(
      'MITRE ATT&CK'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-atlas')).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(screen.getByTestId('coverageOverviewFrameworkTab-atlas')).toHaveTextContent(
      'MITRE ATLAS'
    );
  });

  test('hides the framework tabs but still renders the matrix when the managed source is off', () => {
    mockUseAvailableMitreFrameworks.mockReturnValue(['enterprise']);
    renderCoverageOverviewDashboard();

    expect(screen.queryByTestId('coverageOverviewFrameworkTabs')).not.toBeInTheDocument();
    expect(screen.getByTestId('coverageOverviewMatrix')).toBeInTheDocument();
  });

  test('clicking the ATLAS tab switches the matrix to the ATLAS framework', async () => {
    const user = userEvent.setup();
    const enterpriseData = getMockCoverageOverviewDashboard();
    enterpriseData.mitreTactics = [{ ...enterpriseData.mitreTactics[0], id: 'TA0001' }];
    const atlasData = getMockCoverageOverviewDashboard();
    atlasData.mitreTactics = [{ ...atlasData.mitreTactics[0], id: 'AML.TA0000' }];

    (useFetchCoverageOverviewQuery as jest.Mock).mockImplementation(
      (_filter: unknown, framework: string) => ({
        data: framework === 'atlas' ? atlasData : enterpriseData,
        isLoading: false,
        isMitreError: false,
        frameworkVersion: '16.1',
        refetch: jest.fn(),
      })
    );

    renderCoverageOverviewDashboard();
    expect(screen.getByTestId('coverageOverviewTacticGroup-TA0001')).toBeInTheDocument();

    await user.click(screen.getByTestId('coverageOverviewFrameworkTab-atlas'));

    expect(screen.getByTestId('coverageOverviewTacticGroup-AML.TA0000')).toBeInTheDocument();
    expect(screen.queryByTestId('coverageOverviewTacticGroup-TA0001')).not.toBeInTheDocument();
    expect(screen.getByTestId('coverageOverviewFrameworkTab-atlas')).toHaveAttribute(
      'aria-selected',
      'true'
    );
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
      frameworkVersion: '16.1',
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
