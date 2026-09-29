/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DynamicRiskLevelPanel } from './dynamic_risk_level_panel';
import { TestProviders } from '../../../common/mock';
import { useRiskLevelsEsqlQuery } from '../watchlists/components/hooks/use_risk_levels_esql_query';
import { useKibana } from '../../../common/lib/kibana';
import { RiskSeverity } from '../../../../common/search_strategy';
import { ENTITY_RISK_LEVEL_FIELD } from './risk_level_breakdown_table';
import { RiskScoreDonutChart } from '../risk_score_donut_chart';

vi.mock('../watchlists/components/hooks/use_risk_levels_esql_query');
vi.mock('../../../common/lib/kibana');
vi.mock('../../../common/hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: vi.fn(() => 'default'),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../risk_score_donut_chart', () => {
  const mocked = {
    RiskScoreDonutChart: vi.fn(() => <div data-test-subj="mock-risk-score-donut-chart" />),
  };
  return { ...mocked, default: mocked };
});

const mockUseRiskLevelsEsqlQuery = useRiskLevelsEsqlQuery as Mock;
const mockUseKibana = useKibana as Mock;
const mockRiskScoreDonutChart = RiskScoreDonutChart as unknown as Mock;

const buildKibanaServices = (addFilters: Mock, isV2Enabled: boolean) => ({
  services: {
    uiSettings: {
      get: vi.fn((key: string) => {
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
    vi.clearAllMocks();

    mockUseRiskLevelsEsqlQuery.mockReturnValue({
      records: [],
      isLoading: false,
      refetch: vi.fn(),
      inspect: { dsl: ['mock-dsl'], response: ['mock-response'] },
    });
  });

  it('renders the entity risk levels title', () => {
    mockUseKibana.mockReturnValue(buildKibanaServices(vi.fn(), false));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel />
      </TestProviders>
    );

    expect(screen.getByText('Entity risk levels')).toBeInTheDocument();
  });

  it('renders the entity risk levels title when a watchlist is selected', () => {
    mockUseKibana.mockReturnValue(buildKibanaServices(vi.fn(), true));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel watchlistId="wl-1" />
      </TestProviders>
    );

    expect(screen.getByText('Entity risk levels')).toBeInTheDocument();
  });

  it('renders the inspect button', () => {
    mockUseKibana.mockReturnValue(buildKibanaServices(vi.fn(), true));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel />
      </TestProviders>
    );

    expect(screen.getByTestId('inspect-icon-button')).toBeInTheDocument();
  });

  it('threads an onPartitionClick handler to the donut that adds a global filter for entity.risk.calculated_level', () => {
    const addFilters = vi.fn();
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

  it('applies custom filter for Unknown entity.risk.calculated_level', () => {
    const addFilters = vi.fn();
    mockUseKibana.mockReturnValue(buildKibanaServices(addFilters, false));

    render(
      <TestProviders>
        <DynamicRiskLevelPanel />
      </TestProviders>
    );

    expect(mockRiskScoreDonutChart).toHaveBeenCalled();
    const donutProps = mockRiskScoreDonutChart.mock.calls[0][0];
    expect(typeof donutProps.onPartitionClick).toBe('function');

    donutProps.onPartitionClick(RiskSeverity.Unknown);

    expect(addFilters).toHaveBeenCalledTimes(1);
    expect(addFilters).toHaveBeenCalledWith([
      {
        meta: {
          alias: 'Risk level: Unknown',
          disabled: false,
          negate: false,
          key: 'entity.risk.calculated_level',
        },
        query: {
          bool: {
            should: [
              { match_phrase: { [ENTITY_RISK_LEVEL_FIELD]: 'Unknown' } },
              { bool: { must_not: { exists: { field: ENTITY_RISK_LEVEL_FIELD } } } },
            ],
            minimum_should_match: 1,
          },
        },
      },
    ]);
  });
});
