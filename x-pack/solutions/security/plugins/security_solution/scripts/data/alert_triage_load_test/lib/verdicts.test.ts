/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verdictFromTags } from './verdicts';

describe('verdictFromTags', () => {
  it.each(['true_positive', 'false_positive', 'inconclusive'] as const)(
    'reads az:%s',
    (verdict) => {
      expect(verdictFromTags(['other', `az:${verdict}`])).toBe(verdict);
    }
  );

  it('returns nothing when the alert carries no verdict tag', () => {
    expect(verdictFromTags(['other'])).toBeUndefined();
    expect(verdictFromTags(undefined)).toBeUndefined();
  });
});
