/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useQueryToggle } from '../../common/containers/query_toggle';
import { UserRiskScoreQueryTabBody } from './user_risk_score_tab_body';
import { UsersType } from '../../explore/users/store/model';
import { useEntityStoreRiskScore } from '../api/hooks/use_entity_store_risk_score';
import { useEntityStoreRiskScoreKpi } from '../api/hooks/use_entity_store_risk_score_kpi';

jest.mock('../api/hooks/use_entity_store_risk_score');
jest.mock('../api/hooks/use_entity_store_risk_score_kpi');
jest.mock('../../common/containers/query_toggle');
jest.mock('../../common/lib/kibana');

describe('All users query tab body', () => {
  const mockUseEntityStoreRiskScore = useEntityStoreRiskScore as jest.Mock;
  const mockUseEntityStoreRiskScoreKpi = useEntityStoreRiskScoreKpi as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: UsersType.page,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });

    mockUseEntityStoreRiskScore.mockReturnValue({
      loading: false,
      data: [],
      error: undefined,
      hasEngineBeenInstalled: true,
      inspect: { dsl: [], response: [] },
      isAuthorized: true,
      isInspected: false,
      refetch: jest.fn(),
      totalCount: 0,
    });
    mockUseEntityStoreRiskScoreKpi.mockReturnValue({
      loading: false,
      error: undefined,
      inspect: { dsl: [], response: [] },
      isModuleDisabled: false,
      refetch: jest.fn(),
      severityCount: {
        unknown: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
      },
    });
  });

  it('runs the entity-store risk score and kpi queries when toggleStatus is true', () => {
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
  });

  it('skips both queries when toggleStatus is false', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
});
