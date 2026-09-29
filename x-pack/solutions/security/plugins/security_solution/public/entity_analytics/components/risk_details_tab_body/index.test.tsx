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
import { TestProviders } from '../../../common/mock';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { RiskDetailsTabBody } from '.';
import { EntityType } from '../../../../common/search_strategy';
import { useEntityRiskScores } from '../../api/hooks/use_entity_risk_scores';

vi.mock('../../api/hooks/use_entity_risk_scores');
vi.mock('../../../common/containers/query_toggle');

describe.each([EntityType.host, EntityType.user])('Risk Tab Body entityType: %s', (riskEntity) => {
  const defaultProps = {
    entityId: 'entity-123',
    setQuery: vi.fn(),
    riskEntity,
  };

  const riskScoreState = {
    loading: false,
    inspect: {
      dsl: [],
      response: [],
    },
    isInspected: false,
    totalCount: 0,
    data: [],
    refetch: vi.fn(),
    hasEngineBeenInstalled: true,
  };

  const mockUseEntityRiskScores = useEntityRiskScores as Mock;
  const mockUseQueryToggle = useQueryToggle as Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEntityRiskScores.mockReturnValue({
      base: riskScoreState,
      resolution: {
        state: riskScoreState,
        hasResolutionGroup: false,
        resolutionTargetEntityId: undefined,
      },
      refetch: vi.fn(),
    });
    mockUseQueryToggle.mockReturnValue({ toggleStatus: true, setToggleStatus: vi.fn() });
  });

  it('reads risk scores by entity id', () => {
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityRiskScores).toHaveBeenCalledWith(riskEntity, 'entity-123');
  });

  it('skips the read when the contributors toggle is off', () => {
    mockUseQueryToggle.mockReturnValue({ toggleStatus: false, setToggleStatus: vi.fn() });
    render(
      <TestProviders>
        <RiskDetailsTabBody {...defaultProps} />
      </TestProviders>
    );
    expect(mockUseEntityRiskScores).toHaveBeenCalledWith(riskEntity, undefined);
  });
});
