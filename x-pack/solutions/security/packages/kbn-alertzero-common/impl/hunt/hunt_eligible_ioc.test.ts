/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isHuntEligibleIoc } from './hunt_eligible_ioc';

describe('isHuntEligibleIoc', () => {
  it.each([
    { tier: 'discriminating' },
    { tier: 'contextual' },
    { tier: 'uncertain' },
    { tier: undefined },
    { tier: null },
    { tier: '' },
  ])('returns true for eligible tier $tier when not deferred', ({ tier }) => {
    expect(isHuntEligibleIoc({ tier })).toBe(true);
  });

  it.each([{ tier: 'reference' }, { tier: 'denied' }, { tier: 'high' }])(
    'returns false for ineligible tier $tier',
    ({ tier }) => {
      expect(isHuntEligibleIoc({ tier })).toBe(false);
    }
  );

  it('returns false when deferred_unreviewed is true even for a promotable tier', () => {
    expect(isHuntEligibleIoc({ tier: 'discriminating', deferred_unreviewed: true })).toBe(false);
  });
});
