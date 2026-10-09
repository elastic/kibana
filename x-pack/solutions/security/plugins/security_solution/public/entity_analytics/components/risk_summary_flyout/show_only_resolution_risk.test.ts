/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldShowOnlyResolutionRisk } from './show_only_resolution_risk';

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
