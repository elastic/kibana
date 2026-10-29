/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '../../../../common';
import {
  equalPercentages,
  parseRulesJson,
  percentageWeightsAreValid,
  percentageWeightsTotal,
  remapRuleVariations,
  serializeRules,
} from './rules_model';

const variations = [true, false] as const;

const sampleRules = (): Rule[] => [
  { type: 'match', attribute: 'user', operator: 'in', values: ['a'], return: true },
  { type: 'percentage', per_attribute: 'id', percentages: { true: 25, false: 75 } },
  {
    type: 'match',
    attribute: 'region',
    operator: 'in',
    values: ['eu'],
    rules: [{ type: 'match', attribute: 'plan', operator: 'in', values: ['pro'], return: false }],
  },
];

describe('rule composer model', () => {
  it('round-trips rules through JSON', () => {
    const rules = sampleRules();
    const parsed = parseRulesJson(serializeRules(rules), {
      variations,
      valueType: 'boolean',
    });
    expect(parsed).toEqual({ ok: true, rules });
  });

  it('rejects invalid JSON without returning rules', () => {
    const parsed = parseRulesJson('{', { variations, valueType: 'boolean' });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.length).toBeGreaterThan(0);
      expect('rules' in parsed).toBe(false);
    }
  });

  it('rejects a match rule that both serves a variation and nests rules', () => {
    const parsed = parseRulesJson(
      JSON.stringify([
        {
          type: 'match',
          attribute: 'org',
          operator: 'in',
          values: ['elastic'],
          return: true,
          rules: [
            { type: 'match', attribute: 'plan', operator: 'in', values: ['pro'], return: false },
          ],
        },
      ]),
      { variations, valueType: 'boolean' }
    );
    expect(parsed.ok).toBe(false);
  });

  it('rejects percentage weights that do not sum to 100', () => {
    expect(percentageWeightsTotal({ true: 40, false: 60 })).toBe(100);
    expect(percentageWeightsAreValid({ true: 40, false: 60 })).toBe(true);
    expect(percentageWeightsAreValid({ true: 40, false: 50 })).toBe(false);
    expect(percentageWeightsAreValid({ true: 10.5, false: 89.5 })).toBe(false);

    const parsed = parseRulesJson(
      JSON.stringify([
        { type: 'percentage', per_attribute: 'id', percentages: { true: 40, false: 50 } },
      ]),
      { variations, valueType: 'boolean' }
    );
    expect(parsed.ok).toBe(false);
  });

  it('distributes remainder so equal weights still sum to 100', () => {
    expect(equalPercentages(['a', 'b', 'c'])).toEqual({ a: 33, b: 33, c: 34 });
    expect(percentageWeightsTotal(equalPercentages(['a', 'b', 'c']))).toBe(100);
    expect(percentageWeightsAreValid(equalPercentages(['on', 'off']))).toBe(true);
  });

  it('remaps percentage keys when a variation is renamed', () => {
    const rules: Rule[] = [
      { type: 'percentage', per_attribute: 'id', percentages: { on: 10, off: 90 } },
    ];
    expect(remapRuleVariations(rules, ['on', 'off'], ['enabled', 'off'])).toEqual([
      { type: 'percentage', per_attribute: 'id', percentages: { enabled: 10, off: 90 } },
    ]);
  });
});
