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
import { TestProviders } from '../../common/mock';
import { useQueryToggle } from '../../common/containers/query_toggle';
import { UserRiskScoreQueryTabBody } from './user_risk_score_tab_body';
import { UsersType } from '../../explore/users/store/model';
import { useEntityStoreRiskScore } from '../api/hooks/use_entity_store_risk_score';
import { useEntityStoreRiskScoreKpi } from '../api/hooks/use_entity_store_risk_score_kpi';

vi.mock('../api/hooks/use_entity_store_risk_score');
vi.mock('../api/hooks/use_entity_store_risk_score_kpi');
vi.mock('../../common/containers/query_toggle');
vi.mock('../../common/lib/kibana');

describe('All users query tab body', () => {
  const mockUseEntityStoreRiskScore = useEntityStoreRiskScore as Mock;
  const mockUseEntityStoreRiskScoreKpi = useEntityStoreRiskScoreKpi as Mock;
  const mockUseQueryToggle = useQueryToggle as Mock;
  const defaultProps = {
    indexNames: [],
    setQuery: vi.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: UsersType.page,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() });

    mockUseEntityStoreRiskScore.mockReturnValue({
      loading: false,
      data: [],
      error: undefined,
      hasEngineBeenInstalled: true,
      inspect: { dsl: [], response: [] },
      isAuthorized: true,
      isInspected: false,
      refetch: vi.fn(),
      totalCount: 0,
    });
    mockUseEntityStoreRiskScoreKpi.mockReturnValue({
      loading: false,
      error: undefined,
      inspect: { dsl: [], response: [] },
      isModuleDisabled: false,
      refetch: vi.fn(),
      severityCount: {
        unknown: 0,
        low: 0,
        moderate: 0,
        high: 0,
        critical: 0,
      },
    });
  });

  it('toggleStatus=true, do not skip', () => {
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(false);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(false);
  });

  it('toggleStatus=false, skip', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <UserRiskScoreQueryTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityStoreRiskScore.mock.calls[0][0].skip).toEqual(true);
    expect(mockUseEntityStoreRiskScoreKpi.mock.calls[0][0].skip).toEqual(true);
  });
});
