/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { HostRiskScoreQueryTabBody } from './host_risk_score_tab_body';
import { HostsType } from '../../store/model';
import { useRiskScoreKpi } from '../../../../entity_analytics/api/hooks/use_risk_score_kpi';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useEntityStoreRiskScoreKpi } from '../../../../entity_analytics/api/hooks/use_entity_store_risk_score_kpi';
import { useEntityStoreRiskScore } from '../../../../entity_analytics/api/hooks/use_entity_store_risk_score';
import { useUiSetting } from '../../../../common/lib/kibana';
import { RiskSeverity } from '../../../../../common/search_strategy';

jest.mock('../../../../entity_analytics/api/hooks/use_risk_score_kpi');
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');
jest.mock('../../../../entity_analytics/api/hooks/use_entity_store_risk_score_kpi');
jest.mock('../../../../entity_analytics/api/hooks/use_entity_store_risk_score');
jest.mock('../../../../common/containers/query_toggle');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useUiSetting: jest.fn(() => false),
  };
});

const sharedRiskScoreReturn = {
  data: [],
  error: undefined,
  hasEngineBeenInstalled: true,
  inspect: { dsl: [], response: [] },
  isAuthorized: true,
  isInspected: false,
  loading: false,
  refetch: jest.fn(),
  totalCount: 0,
};

const sharedKpiReturn = {
  error: undefined,
  inspect: { dsl: [], response: [] },
  isModuleDisabled: false,
  loading: false,
  refetch: jest.fn(),
  severityCount: {
    [RiskSeverity.Unknown]: 12,
    [RiskSeverity.Low]: 12,
    [RiskSeverity.Moderate]: 12,
    [RiskSeverity.High]: 12,
    [RiskSeverity.Critical]: 12,
  },
};

describe('Host risk score query tab body', () => {
  const mockUseRiskScore = useRiskScore as jest.Mock;
  const mockUseEntityStoreRiskScore = useEntityStoreRiskScore as jest.Mock;
  const mockUseRiskScoreKpi = useRiskScoreKpi as jest.Mock;
  const mockUseEntityStoreRiskScoreKpi = useEntityStoreRiskScoreKpi as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockUseUiSetting = useUiSetting as jest.Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: HostsType.page,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockReturnValue(false);
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseRiskScore.mockReturnValue(sharedRiskScoreReturn);
    mockUseEntityStoreRiskScore.mockReturnValue(sharedRiskScoreReturn);
    mockUseRiskScoreKpi.mockReturnValue(sharedKpiReturn);
    mockUseEntityStoreRiskScoreKpi.mockReturnValue(sharedKpiReturn);
  });
  it('toggleStatus=true, entity store v2 off: legacy hooks are not skipped; entity store hooks are skipped', () => {
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
  it('toggleStatus=false, entity store v2 off: all hooks skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
  it('toggleStatus=true, entity store v2 on: entity store hooks are not skipped; legacy hooks are skipped', () => {
    mockUseUiSetting.mockReturnValue(true);
    render(
      <TestProviders>
        <HostRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
  });
});
