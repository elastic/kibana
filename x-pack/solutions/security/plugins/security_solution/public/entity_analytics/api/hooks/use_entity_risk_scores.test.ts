/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityRiskScores } from './use_entity_risk_scores';
import { useRiskScore } from './use_risk_score';
import { useResolutionGroup } from '../../components/entity_resolution/hooks/use_resolution_group';
import { useNewEntityAnalyticsPage } from '../../hooks/use_new_entity_analytics_page';
import { EntityType } from '../../../../common/entity_analytics/types';

jest.mock('./use_risk_score', () => ({
  useRiskScore: jest.fn(),
}));
jest.mock('../../components/entity_resolution/hooks/use_resolution_group', () => ({
  useResolutionGroup: jest.fn(),
}));
jest.mock('../../components/entity_resolution/helpers', () => ({
  getEntityId: jest.fn().mockReturnValue('target-user'),
}));
jest.mock('../../hooks/use_new_entity_analytics_page', () => ({
  useNewEntityAnalyticsPage: jest.fn(),
}));

const mockUseRiskScore = useRiskScore as jest.Mock;
const mockUseResolutionGroup = useResolutionGroup as jest.Mock;
const mockUseNewEntityAnalyticsPage = useNewEntityAnalyticsPage as jest.Mock;

const stubRiskScoreState = {
  data: undefined,
  error: undefined,
  inspect: { dsl: [], response: [] },
  isInspected: false,
  isAuthorized: true,
  hasEngineBeenInstalled: true,
  loading: false,
  totalCount: 0,
  refetch: jest.fn(),
};

const executionContext = {
  child: {
    type: 'security_solution',
    name: 'entity_analytics:entity_details_flyout-user_right',
    id: 'user_risk_score',
  },
};

const resolutionScoreFilterFor = (entityId: string) =>
  expect.objectContaining({
    skip: false,
    filterQuery: {
      bool: {
        filter: [
          { term: { 'user.risk.id_value': entityId } },
          { term: { 'user.risk.score_type': 'resolution' } },
        ],
      },
    },
  });

const resolutionCall = () => mockUseRiskScore.mock.calls[1][0];

/** Mirrors react-query: a disabled query yields no data. */
const mockResolutionGroupData = (data: unknown) =>
  mockUseResolutionGroup.mockImplementation(
    (_entityId: string, options?: { enabled?: boolean }) => ({
      data: options?.enabled === false ? undefined : data,
    })
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRiskScore.mockReturnValue(stubRiskScoreState);
  mockUseNewEntityAnalyticsPage.mockReturnValue(false);
  // group_size > 1 activates the resolution branch so both useRiskScore calls fire
  mockResolutionGroupData({
    target: { 'user.name': 'target-user' },
    aliases: [],
    group_size: 2,
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

  describe('new entity analytics page flag off', () => {
    it('looks the group up and fetches the resolution score for its target', () => {
      const { result } = renderHook(() => useEntityRiskScores(EntityType.user, 'user-1'));

      expect(mockUseResolutionGroup).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ enabled: true })
      );
      expect(resolutionCall()).toEqual(resolutionScoreFilterFor('target-user'));
      expect(result.current.resolution.hasResolutionGroup).toBe(true);
      expect(result.current.resolution.resolutionTargetEntityId).toBe('target-user');
    });

    it('skips the resolution score when the entity is not part of a group', () => {
      mockResolutionGroupData({ target: { 'user.name': 'user-1' }, aliases: [], group_size: 1 });

      const { result } = renderHook(() => useEntityRiskScores(EntityType.user, 'user-1'));

      expect(resolutionCall()).toEqual(
        expect.objectContaining({ skip: true, filterQuery: undefined })
      );
      expect(result.current.resolution.hasResolutionGroup).toBe(false);
    });

    it('keeps the legacy group lookup enabled (callers never render a group view with the flag off)', () => {
      const { result } = renderHook(() =>
        useEntityRiskScores(EntityType.user, 'user-1', { isGroupView: false })
      );

      expect(mockUseResolutionGroup).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ enabled: true })
      );
      expect(result.current.resolution.resolutionTargetEntityId).toBe('target-user');
    });
  });

  describe('new entity analytics page flag on', () => {
    beforeEach(() => {
      mockUseNewEntityAnalyticsPage.mockReturnValue(true);
    });

    it('fetches the resolution score for the entity itself in the group view without looking the group up', () => {
      const { result } = renderHook(() =>
        useEntityRiskScores(EntityType.user, 'user-1', { isGroupView: true })
      );

      expect(mockUseResolutionGroup).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ enabled: false })
      );
      expect(resolutionCall()).toEqual(resolutionScoreFilterFor('user-1'));
      expect(result.current.resolution.hasResolutionGroup).toBe(true);
      expect(result.current.resolution.resolutionTargetEntityId).toBe('user-1');
    });

    it('does not fetch the resolution score outside the group view even if the entity belongs to a group', () => {
      const { result } = renderHook(() => useEntityRiskScores(EntityType.user, 'user-1'));

      expect(mockUseResolutionGroup).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ enabled: false })
      );
      expect(resolutionCall()).toEqual(
        expect.objectContaining({ skip: true, filterQuery: undefined })
      );
      expect(result.current.resolution.hasResolutionGroup).toBe(false);
      expect(result.current.resolution.resolutionTargetEntityId).toBeUndefined();
    });

    it('does not fetch the resolution score without an entity id', () => {
      renderHook(() => useEntityRiskScores(EntityType.user, undefined, { isGroupView: true }));

      expect(resolutionCall()).toEqual(
        expect.objectContaining({ skip: true, filterQuery: undefined })
      );
    });
  });
});
