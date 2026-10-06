/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveFpTpOutcome, type FpTpCheckResult } from './verdict_rules';

describe('deriveFpTpOutcome', () => {
  it.each<[FpTpCheckResult, FpTpCheckResult, FpTpCheckResult, string]>([
    ['supports', 'neutral', 'contradicts', 'inconclusive'],
    ['contradicts', 'contradicts', 'contradicts', 'false_positive'],
    ['neutral', 'neutral', 'contradicts', 'false_positive'],
    ['skipped', 'contradicts', 'contradicts', 'inconclusive'],
    ['contradicts', 'skipped', 'skipped', 'inconclusive'],
    ['supports', 'supports', 'supports', 'true_positive'],
    ['supports', 'neutral', 'supports', 'true_positive'],
    ['supports', 'supports', 'neutral', 'true_positive'],
    ['skipped', 'neutral', 'supports', 'true_positive'],
    ['supports', 'skipped', 'skipped', 'inconclusive'],
    ['neutral', 'neutral', 'neutral', 'inconclusive'],
  ])(
    'returns the outcome for entityRole %s, processParent %s, networkDestination %s: %s',
    (entityRole, processParent, networkDestination, outcome) => {
      expect(deriveFpTpOutcome({ entityRole, processParent, networkDestination })).toBe(outcome);
    }
  );
});
