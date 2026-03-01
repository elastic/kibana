/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { RiskDetailsTabBody } from '.';
import { EntityType } from '../../../../common/search_strategy';
import { HostsType } from '../../../explore/hosts/store/model';
import { UsersType } from '../../../explore/users/store/model';
import { useHostRiskScoresFromEntityStore } from '../../api/hooks/use_host_risk_scores_from_entity_store';
import { useUserRiskScoresFromEntityStore } from '../../api/hooks/use_user_risk_scores_from_entity_store';

jest.mock('../../api/hooks/use_host_risk_scores_from_entity_store');
jest.mock('../../api/hooks/use_user_risk_scores_from_entity_store');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe.each([EntityType.host, EntityType.user])('Risk Tab Body entityType: %s', (riskEntity) => {
  const defaultProps = {
    entityName: 'testEntity',
    indexNames: [],
    setQuery: jest.fn(),
    skip: false,
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    type: riskEntity === EntityType.host ? HostsType.page : UsersType.page,
    riskEntity,
  };

  const mockUseHostRiskScoresFromEntityStore = useHostRiskScoresFromEntityStore as jest.Mock;
  const mockUseUserRiskScoresFromEntityStore = useUserRiskScoresFromEntityStore as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHostRiskScoresFromEntityStore.mockReturnValue({
      data: [],
      loading: false,
      inspect: { dsl: [], response: [] },
      refetch: jest.fn(),
      hasEngineBeenInstalled: true,
    });
    mockUseUserRiskScoresFromEntityStore.mockReturnValue({
      data: [],
      loading: false,
      inspect: { dsl: [], response: [] },
      refetch: jest.fn(),
      hasEngineBeenInstalled: true,
    });
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: jest.fn() });
  });

  it('calls with correct arguments for each entity', () => {
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    if (riskEntity === EntityType.host) {
      expect(mockUseHostRiskScoresFromEntityStore).toBeCalledWith({
        filterQuery: JSON.stringify({ terms: { 'host.name': ['testEntity'] } }),
        pagination: { cursorStart: 0, querySize: 1 },
        skip: false,
      });
    } else {
      expect(mockUseUserRiskScoresFromEntityStore).toBeCalledWith({
        filterQuery: JSON.stringify({ terms: { 'user.name': ['testEntity'] } }),
        pagination: { cursorStart: 0, querySize: 1 },
        skip: false,
      });
    }
  });

  it("doesn't skip when both toggleStatus are true", () => {
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    if (riskEntity === EntityType.host) {
      expect(mockUseHostRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(false);
    } else {
      expect(mockUseUserRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(false);
    }
  });

  it("doesn't skip when at least one toggleStatus is true", () => {
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });
    mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    if (riskEntity === EntityType.host) {
      expect(mockUseHostRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(false);
    } else {
      expect(mockUseUserRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(false);
    }
  });

  it('does skip when both toggleStatus are false', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    if (riskEntity === EntityType.host) {
      expect(mockUseHostRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(true);
    } else {
      expect(mockUseUserRiskScoresFromEntityStore.mock.calls[0][0].skip).toEqual(true);
    }
  });

  it('uses filterQuery from props when provided for host', () => {
    if (riskEntity !== EntityType.host) return;
    const hostFilterQuery = '{"bool":{"must":[{"match":{"host.name":"my-host"}}]}}';
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} filterQuery={hostFilterQuery} />
      </TestProviders>
    );
    expect(mockUseHostRiskScoresFromEntityStore).toBeCalledWith({
      filterQuery: hostFilterQuery,
      pagination: { cursorStart: 0, querySize: 1 },
      skip: false,
    });
  });

  it('uses filterQuery from props when provided for user', () => {
    if (riskEntity !== EntityType.user) return;
    const userFilterQuery = '{"bool":{"must":[{"match":{"user.name":"my-user"}}]}}';
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} filterQuery={userFilterQuery} />
      </TestProviders>
    );
    expect(mockUseUserRiskScoresFromEntityStore).toBeCalledWith({
      filterQuery: userFilterQuery,
      pagination: { cursorStart: 0, querySize: 1 },
      skip: false,
    });
  });
});
