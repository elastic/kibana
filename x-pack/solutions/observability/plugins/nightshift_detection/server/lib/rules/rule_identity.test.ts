/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import { computeRuleId, getManagedRuleName } from './rule_identity';

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

  it('never cuts an emoji in half', () => {
    const room = MAX_NAME_LENGTH - 'Known failures: '.length - ' (01234567)'.length;
    // The emoji's two halves straddle the cut.
    const name = getManagedRuleName({
      strategyName: 'Known failures',
      title: `${'a'.repeat(room - 1)}🔥`,
      ruleId: '0123456789abcdef',
    });

    expect(name.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(name).toBe(`Known failures: ${'a'.repeat(room - 1)} (01234567)`);
  });
});

describe('computeRuleId', () => {
  // A strategy refactor that builds the same rule another way must not recreate every rule.
  it('gives the same id whatever order the rule keys come in', () => {
    const identity = { spaceId: 'space-a', strategy: 'known_failures', sourceId: 'source-1' };

    expect(
      computeRuleId({
        ...identity,
        rule: {
          kind: 'signal',
          time_field: '@timestamp',
          schedule: { every: '5m', lookback: '5m' },
          query: { base: 'FROM logs' },
        },
      })
    ).toBe(
      computeRuleId({
        ...identity,
        rule: {
          query: { base: 'FROM logs' },
          schedule: { lookback: '5m', every: '5m' },
          time_field: '@timestamp',
          kind: 'signal',
        },
      })
    );
  });
});
