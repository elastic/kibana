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
import { useUserRiskScoresFromEntityStore } from '../api/hooks/use_user_risk_scores_from_entity_store';
import { useUserRiskScoreKpiFromEntityStore } from '../api/hooks/use_user_risk_score_kpi_from_entity_store';

jest.mock('../api/hooks/use_user_risk_score_kpi_from_entity_store');
jest.mock('../api/hooks/use_user_risk_scores_from_entity_store');
jest.mock('../../common/containers/query_toggle');
jest.mock('../../common/lib/kibana');

describe('User risk score query tab body', () => {
  const mockUseUserRiskScoresFromEntityStore =
    useUserRiskScoresFromEntityStore as jest.Mock;
  const mockUseUserRiskScoreKpiFromEntityStore =
    useUserRiskScoreKpiFromEntityStore as jest.Mock;
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

    mockUseUserRiskScoresFromEntityStore.mockReturnValue({
      data: [],
      totalCount: 0,
      loading: false,
      refetch: jest.fn(),
      inspect: { dsl: [], response: [], indexPattern: [] },
      hasEngineBeenInstalled: true,
    });
    mockUseUserRiskScoreKpiFromEntityStore.mockReturnValue({
      loading: false,
      severityCount: {
        unknown: 12,
        low: 12,
        moderate: 12,
        high: 12,
        critical: 12,
      },
    });
  });

  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUserRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseUserRiskScoreKpiFromEntityStore.mock.calls[0][0].skip).toEqual(false);
  });

  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseUserRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseUserRiskScoreKpiFromEntityStore.mock.calls[0][0].skip).toEqual(true);
  });
});
