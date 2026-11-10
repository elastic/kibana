/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';
import { getContinuousOnboardingTarget } from './get_continuous_onboarding_target';

describe('getContinuousOnboardingTarget', () => {
  it.each<{
    eventType: SourceChangeEvent['type'];
    total: number;
    expected: boolean | undefined;
  }>([
    { eventType: 'created', total: 1, expected: true },
    { eventType: 'created', total: 2, expected: undefined },
    { eventType: 'deleted', total: 0, expected: false },
    { eventType: 'deleted', total: 1, expected: undefined },
    { eventType: 'updated', total: 1, expected: undefined },
  ])(
    'returns $expected for a $eventType event with $total sources',
    ({ eventType, total, expected }) => {
      expect(getContinuousOnboardingTarget({ eventType, total })).toBe(expected);
    }
  );
});
