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
import { useUiSetting } from '../../../common/lib/kibana';
import { RiskDetailsTabBody } from '.';
import { EntityType } from '../../../../common/search_strategy';
import { useRiskScore } from '../../api/hooks/use_risk_score';

jest.mock('../../api/hooks/use_risk_score');
jest.mock('../../../common/containers/query_toggle');
jest.mock('../../../common/lib/kibana');

describe.each([EntityType.host, EntityType.user])('Risk Tab Body entityType: %s', (riskEntity) => {
  const defaultProps = {
    entityName: 'testEntity',
    setQuery: jest.fn(),
    startDate: '2019-06-25T04:31:59.345Z',
    endDate: '2019-06-25T06:31:59.345Z',
    riskEntity,
  };

  const mockUseRiskScore = useRiskScore as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockUseUiSetting = useUiSetting as jest.Mock;

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
    mockUseUiSetting.mockReturnValue(false);
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

  it('uses entityId as filter when entityStoreV2 is enabled', () => {
    mockUseUiSetting.mockReturnValueOnce(true);
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} entityId="entity-123" />
      </TestProviders>
    );
    expect(mockUseRiskScore).toBeCalledWith(
      expect.objectContaining({
        filterQuery: {
          terms: {
            [`${riskEntity}.name`]: ['entity-123'],
          },
        },
      })
    );
  });

  it("doesn't skip when toggleStatus is true", () => {
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(false);
  });

  it('skips when toggleStatus is false', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: jest.fn() });

    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseRiskScore.mock.calls[0][0].skip).toEqual(true);
  });
});
