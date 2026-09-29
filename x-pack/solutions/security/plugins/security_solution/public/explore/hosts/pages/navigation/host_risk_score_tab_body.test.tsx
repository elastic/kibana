/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HostRiskScoreQueryTabBody } from './host_risk_score_tab_body';
import { HostsType } from '../../store/model';
import { useEntityStoreRiskScoreKpi } from '../../../../entity_analytics/api/hooks/use_entity_store_risk_score_kpi';
import { useEntityStoreRiskScore } from '../../../../entity_analytics/api/hooks/use_entity_store_risk_score';
import { RiskSeverity } from '../../../../../common/search_strategy';

vi.mock('../../../../entity_analytics/api/hooks/use_entity_store_risk_score_kpi');
vi.mock('../../../../entity_analytics/api/hooks/use_entity_store_risk_score');
vi.mock('../../../../common/containers/query_toggle');

const sharedRiskScoreReturn = {
  data: [],
  error: undefined,
  hasEngineBeenInstalled: true,
  inspect: { dsl: [], response: [] },
  isAuthorized: true,
  isInspected: false,
  loading: false,
  refetch: vi.fn(),
  totalCount: 0,
};

const sharedKpiReturn = {
  error: undefined,
  inspect: { dsl: [], response: [] },
  isModuleDisabled: false,
  loading: false,
  refetch: vi.fn(),
  severityCount: {
    [RiskSeverity.Unknown]: 12,
    [RiskSeverity.Low]: 12,
    [RiskSeverity.Moderate]: 12,
    [RiskSeverity.High]: 12,
    [RiskSeverity.Critical]: 12,
  },
};

describe('Host risk score query tab body', () => {
  const mockUseEntityStoreRiskScore = useEntityStoreRiskScore as Mock;
  const mockUseEntityStoreRiskScoreKpi = useEntityStoreRiskScoreKpi as Mock;
  const mockUseQueryToggle = useQueryToggle as Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: vi.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: HostsType.page,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() });
    mockUseEntityStoreRiskScore.mockReturnValue(sharedRiskScoreReturn);
    mockUseEntityStoreRiskScoreKpi.mockReturnValue(sharedKpiReturn);
  });
  it('toggleStatus=true: entity store hooks are not skipped', () => {
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
  });
  it('toggleStatus=false: entity store hooks skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
});
