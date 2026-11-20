/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import { getManagedRuleName } from './rule_identity';

describe('getManagedRuleName', () => {
  it('cuts a long title so the name fits Alerting and keeps the short id', () => {
    const name = getManagedRuleName({
      strategyName: 'Known failures',
      title: 'a'.repeat(512),
      ruleId: '0123456789abcdef',
    });

    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(name).toMatch(/ \(01234567\)$/);
  });
});
