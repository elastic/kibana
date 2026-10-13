/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shouldShowOnlyResolutionRisk } from './show_only_resolution_risk';

describe('shouldShowOnlyResolutionRisk', () => {
  it('is on when the group view has a resolution score', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        isGroupView: true,
        hasResolutionScore: true,
        resolutionLoading: false,
      })
    ).toBe(true);
  });

  it('is on while the resolution score for the group view is still loading', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        isGroupView: true,
        hasResolutionScore: false,
        resolutionLoading: true,
      })
    ).toBe(true);
  });

  it('is off outside the group view even when a resolution score is available', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        isGroupView: false,
        hasResolutionScore: true,
        resolutionLoading: false,
      })
    ).toBe(false);
  });

  it('is off when the group view has finished loading without a resolution score', () => {
    expect(
      shouldShowOnlyResolutionRisk({
        isGroupView: true,
        hasResolutionScore: false,
        resolutionLoading: false,
      })
    ).toBe(false);
  });
});
