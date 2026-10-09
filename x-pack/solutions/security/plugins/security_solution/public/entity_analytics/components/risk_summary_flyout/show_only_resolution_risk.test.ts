/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../common/entity_analytics/types';
import type { EntityRiskScoresState } from '../../api/hooks/use_entity_risk_scores';
import {
  shouldPromoteResolutionSection,
  shouldShowOnlyResolutionRisk,
} from './show_only_resolution_risk';

const scores = (
  overrides: Partial<EntityRiskScoresState<EntityType.user>['resolution']> = {}
): EntityRiskScoresState<EntityType.user> => ({
  base: { loading: false } as EntityRiskScoresState<EntityType.user>['base'],
  resolution: {
    state: { loading: false, data: undefined } as EntityRiskScoresState<EntityType.user>['resolution']['state'],
    hasResolutionGroup: false,
    resolutionTargetEntityId: undefined,
    ...overrides,
  },
  refetch: () => {},
});

describe('shouldShowOnlyResolutionRisk', () => {
  it('stays off when the facelift flag is off', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        enabled: false,
        hasResolutionGroup: true,
        hasResolutionScore: true,
        resolutionLoading: false,
      })
    ).toBe(false);
  });

  it('is on when a resolution group has a score', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        enabled: true,
        hasResolutionGroup: true,
        hasResolutionScore: true,
        resolutionLoading: false,
      })
    ).toBe(true);
  });

  it('is on while the resolution score for a group is still loading', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        enabled: true,
        hasResolutionGroup: true,
        hasResolutionScore: false,
        resolutionLoading: true,
      })
    ).toBe(true);
  });

  it('is off for an ungrouped entity', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        enabled: true,
        hasResolutionGroup: false,
        hasResolutionScore: false,
        resolutionLoading: false,
      })
    ).toBe(false);
  });

  it('is off when a group has finished loading without a resolution score', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        enabled: true,
        hasResolutionGroup: true,
        hasResolutionScore: false,
        resolutionLoading: false,
      })
    ).toBe(false);
  });
});

describe('shouldPromoteResolutionSection', () => {
  it('promotes when the flag is on and a resolution score is present', () => {
    expect(
      shouldPromoteResolutionSection(
        true,
        scores({
          hasResolutionGroup: true,
          state: {
            loading: false,
            data: [{}],
          } as EntityRiskScoresState<EntityType.user>['resolution']['state'],
        })
      )
    ).toBe(true);
  });

  it('does not promote when the flag is off', () => {
    expect(
      shouldPromoteResolutionSection(
        false,
        scores({
          hasResolutionGroup: true,
          state: {
            loading: false,
            data: [{}],
          } as EntityRiskScoresState<EntityType.user>['resolution']['state'],
        })
      )
    ).toBe(false);
  });
});
