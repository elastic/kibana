/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DynamicRiskLevelPanel } from './dynamic_risk_level_panel';
import { TestProviders } from '../../../common/mock';
import { useCombinedRiskScoreKpi } from './use_combined_risk_score_kpi';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';
import { useKibana } from '../../../common/lib/kibana';
import { RiskSeverity } from '../../../../common/search_strategy';
import { ENTITY_RISK_LEVEL_FIELD } from './risk_level_breakdown_table';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';

jest.mock('./use_combined_risk_score_kpi');
jest.mock('../watchlists/components/hooks/use_risk_levels_esql_query');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(() => 'default'),
}));

jest.mock('../risk_score_donut_chart', () => ({
  RiskScoreDonutChart: jest.fn(() => <div data-test-subj="mock-risk-score-donut-chart" />),
}));

const mockUseCombinedRiskScoreKpi = useCombinedRiskScoreKpi as jest.Mock;
const mockUseRiskLevelsEsqlQuery = useRiskLevelsEsqlQuery as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;
const mockRiskScoreDonutChart = RiskScoreDonutChart as unknown as jest.Mock;

const buildKibanaServices = (addFilters: jest.Mock, isV2Enabled: boolean) => ({
  services: {
    uiSettings: {
      get: jest.fn((key: string) => {
        if (key === 'securitySolution:entityStoreEnableV2') {
          return isV2Enabled;
        }
        return false;
      }),
    },
    data: {
      query: {
        filterManager: {
          addFilters,
        },
      },
    },
  },
});

describe('DynamicRiskLevelPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCombinedRiskScoreKpi.mockReturnValue({
      severityCount: {
        [RiskSeverity.Unknown]: 1,
        [RiskSeverity.Low]: 2,
        [RiskSeverity.Moderate]: 3,
        [RiskSeverity.High]: 4,
        [RiskSeverity.Critical]: 5,
      },
      loading: false,
    });

    mockUseRiskLevelsEsqlQuery.mockReturnValue({
      records: [],
      isLoading: false,
    });
  });

  it('renders the entity risk levels title when no watchlist is selected', () => {
    mockUseKibana.mockReturnValue(buildKibanaServices(jest.fn(), false));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel />
      </TestProviders>
    );

    expect(screen.getByText('Entity risk levels')).toBeInTheDocument();
  });

  it('renders the watchlist-scoped title when a watchlist is selected', () => {
    mockUseKibana.mockReturnValue(buildKibanaServices(jest.fn(), true));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel watchlistId="wl-1" watchlistName="VIP users" />
      </TestProviders>
    );

    expect(screen.getByText('VIP users risk levels')).toBeInTheDocument();
  });

  it('threads an onPartitionClick handler to the donut that adds a global filter for entity.risk.calculated_level', () => {
    const addFilters = jest.fn();
    mockUseKibana.mockReturnValue(buildKibanaServices(addFilters, false));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel />
      </TestProviders>
    );

    expect(mockRiskScoreDonutChart).toHaveBeenCalled();
    const donutProps = mockRiskScoreDonutChart.mock.calls[0][0];
    expect(typeof donutProps.onPartitionClick).toBe('function');

    donutProps.onPartitionClick(RiskSeverity.Critical);

    expect(addFilters).toHaveBeenCalledTimes(1);
    expect(addFilters).toHaveBeenCalledWith([
      {
        meta: {
          alias: null,
          disabled: false,
          negate: false,
        },
        query: { match_phrase: { [ENTITY_RISK_LEVEL_FIELD]: RiskSeverity.Critical } },
      },
    ]);
  });
});
