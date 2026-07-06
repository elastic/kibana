/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CombinedRiskDonutChart } from './combined_risk_donut_chart';
import { TestProviders } from '../../../common/mock';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { RiskSeverity, EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';

jest.mock('./use_combined_risk_score_kpi');
jest.mock('../../../common/containers/query_toggle', () => ({
  useQueryToggle: jest.fn(() => ({
    toggleStatus: true,
    setToggleStatus: jest.fn(),
  })),
}));
jest.mock('../../../common/components/page/manage_query', () => ({
  useQueryInspector: jest.fn(),
}));
jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn(() => ({
    deleteQuery: jest.fn(),
    setQuery: jest.fn(),
  })),
}));

const mockUseCombinedRiskScoreKpi = useCombinedRiskScoreKpi as jest.Mock;

describe('CombinedRiskDonutChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the donut chart with combined severity count', () => {
    const severityCount = {
      [RiskSeverity.Unknown]: 10,
      [RiskSeverity.Low]: 20,
      [RiskSeverity.Moderate]: 30,
      [RiskSeverity.High]: 40,
      [RiskSeverity.Critical]: 50,
    };

    mockUseCombinedRiskScoreKpi.mockReturnValue({
      severityCount,
      loading: false,
      error: undefined,
      isModuleDisabled: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <CombinedRiskDonutChart />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-score-donut-chart')).toBeInTheDocument();
  });

  it('should not render when module is disabled', () => {
    mockUseCombinedRiskScoreKpi.mockReturnValue({
      severityCount: EMPTY_SEVERITY_COUNT,
      loading: false,
      error: undefined,
      isModuleDisabled: true,
      refetch: jest.fn(),
    });

    const { container } = render(
      <TestProviders>
        <CombinedRiskDonutChart />
      </TestProviders>
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle empty severity count', () => {
    mockUseCombinedRiskScoreKpi.mockReturnValue({
      severityCount: EMPTY_SEVERITY_COUNT,
      loading: false,
      error: undefined,
      isModuleDisabled: false,
      refetch: jest.fn(),
    });

    render(
      <TestProviders>
        <CombinedRiskDonutChart />
      </TestProviders>
    );

    expect(screen.getByTestId('risk-score-donut-chart')).toBeInTheDocument();
  });
});
