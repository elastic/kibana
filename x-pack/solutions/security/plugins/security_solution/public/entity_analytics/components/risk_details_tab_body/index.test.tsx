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
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { HostsType } from '../../../explore/hosts/store/model';
import { UsersType } from '../../../explore/users/store/model';
import { useRiskScore } from '../../api/hooks/use_risk_score';

jest.mock('../../api/hooks/use_risk_score');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'Risk Tab Body entityType: %s',
  (riskEntity) => {
    const defaultProps = {
      entityName: 'testEntity',
      indexNames: [],
      setQuery: jest.fn(),
      skip: false,
      startDate: '2019-06-25T04:31:59.345Z',
      endDate: '2019-06-25T06:31:59.345Z',
      type: riskEntity === RiskScoreEntity.host ? HostsType.page : UsersType.page,
      riskEntity,
    };

    const mockUseRiskScore = useRiskScore as jest.Mock;
    const mockUseQueryToggle = useQueryToggle as jest.Mock;
    beforeEach(() => {
      jest.clearAllMocks();

      mockUseRiskScore.mockReturnValue({
        loading: false,
        inspect: {
          dsl: [],
          response: [],
        },
        isInspected: false,
        totalCount: 0,
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
      expect(mockUseRiskScore).toBeCalledWith({
        filterQuery: {
          terms: {
            [`${riskEntity}.name`]: ['testEntity'],
          },
        },
        onlyLatest: false,
        riskEntity,
        skip: false,
        timerange: {
          from: '2019-06-25T04:31:59.345Z',
          to: '2019-06-25T06:31:59.345Z',
        },
      });
    });

    it("doesn't skip when both toggleStatus are true", () => {
      render(
        <TestProviders>
          <RiskDetailsTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    });

    it("doesn't skip when at least one toggleStatus is true", () => {
      mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: true, setToggleStatus: jest.fn() });
      mockUseQueryToggle.mockReturnValueOnce({ toggleStatus: false, setToggleStatus: jest.fn() });

      render(
        <TestProviders>
          <RiskDetailsTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
    });

    it('does skip when both toggleStatus are false', () => {
      mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });

      render(
        <TestProviders>
          <RiskDetailsTabBody {...defaultProps} />
        </TestProviders>
      );
      expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
    });
  }
);
