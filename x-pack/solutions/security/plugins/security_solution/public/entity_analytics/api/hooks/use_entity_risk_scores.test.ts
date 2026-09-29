/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useEntityRiskScores } from './use_entity_risk_scores';
import { useRiskScore } from './use_risk_score';
import { useResolutionGroup } from '../../components/entity_resolution/hooks/use_resolution_group';
import { EntityType } from '../../../../common/entity_analytics/types';

vi.mock('./use_risk_score', () => {
      const mocked = {
      useRiskScore: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/entity_resolution/hooks/use_resolution_group', () => {
      const mocked = {
      useResolutionGroup: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('../../components/entity_resolution/helpers', () => {
      const mocked = {
      getEntityId: vi.fn().mockReturnValue('target-user'),
    };
      return { ...mocked, default: mocked };
    });

const mockUseRiskScore = useRiskScore as Mock;
const mockUseResolutionGroup = useResolutionGroup as Mock;

const stubRiskScoreState = {
  data: undefined,
  error: undefined,
  inspect: { dsl: [], response: [] },
  isInspected: false,
  isAuthorized: true,
  hasEngineBeenInstalled: true,
  loading: false,
  totalCount: 0,
  refetch: vi.fn(),
};

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:entity_details_flyout-user_right',
    id: 'user_risk_score',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseRiskScore.mockReturnValue(stubRiskScoreState);
  // group_size > 1 activates the resolution branch so both useRiskScore calls fire
  mockUseResolutionGroup.mockReturnValue({
    data: { target: { 'user.name': 'target-user' }, aliases: [], group_size: 2 },
  });
});

describe('useEntityRiskScores', () => {
  it('forwards executionContext to base useRiskScore, useResolutionGroup, and resolution useRiskScore', () => {
    renderHook(() => useEntityRiskScores(EntityType.user, 'user-1', { executionContext }));

    // useResolutionGroup must receive the context
    expect(mockUseResolutionGroup).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ executionContext })
    );

    // Both useRiskScore calls (base + resolution) must receive the context
    expect(mockUseRiskScore).toHaveBeenCalledTimes(2);
    expect(mockUseRiskScore).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ executionContext })
    );
    expect(mockUseRiskScore).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ executionContext })
    );
  });
});
