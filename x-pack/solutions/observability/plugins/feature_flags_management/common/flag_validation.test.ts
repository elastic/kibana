/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlagConsistencyInput } from './flag_validation';
import { findPrerequisiteCycle, validateFlagConsistency } from './flag_validation';
import type { Rule } from './schemas/flags';

const baseFlag = (overrides: Partial<FlagConsistencyInput> = {}): FlagConsistencyInput => ({
  key: 'discover.cascadeLayoutEnabled',
  value_type: 'boolean',
  variations: [true, false],
  apps: ['kibana'],
  tags: [],
  environments: { production: { default: false } },
  ...overrides,
});

const paths = (flag: FlagConsistencyInput) => validateFlagConsistency(flag).map(({ path }) => path);

describe('validateFlagConsistency', () => {
  it('accepts a consistent flag', () => {
    expect(
      validateFlagConsistency(
        baseFlag({
          environments: {
            production: {
              default: false,
              prerequisites: [{ flag: 'other', value: true }],
              rules: [
                {
                  type: 'match',
                  attribute: 'kibana.version',
                  operator: 'semver_gte',
                  values: ['9.3.0'],
                  rules: [{ type: 'percentage', per_attribute: 'key', percentages: { true: 100 } }],
                },
                {
                  type: 'match',
                  attribute: 'org',
                  operator: 'in',
                  values: ['elastic'],
                  return: true,
                },
              ],
            },
          },
        })
      )
    ).toEqual([]);
  });

  describe('variations', () => {
    it('rejects variations that do not match value_type', () => {
      expect(
        paths(
          baseFlag({ variations: [true, 'false'], environments: { production: { default: true } } })
        )
      ).toEqual(['variations.1']);
    });

    it('rejects duplicate variations', () => {
      expect(paths(baseFlag({ variations: [true, false, true] }))).toEqual(['variations.2']);
    });

    it('rejects variations that are only distinct before String()', () => {
      expect(
        paths(
          baseFlag({
            value_type: 'number',
            variations: [1, 1.0, 2],
            environments: { production: { default: 1 } },
          })
        )
      ).toEqual(['variations.1']);
    });

    it('rejects a default that is not a variation', () => {
      expect(
        paths(
          baseFlag({
            value_type: 'string',
            variations: ['a', 'b'],
            environments: { production: { default: 'c' } },
          })
        )
      ).toEqual(['environments.production.default']);
    });

    it('rejects a return value that is not a variation', () => {
      expect(
        paths(
          baseFlag({
            value_type: 'string',
            variations: ['a', 'b'],
            environments: {
              production: {
                default: 'a',
                rules: [
                  { type: 'match', attribute: 'x', operator: 'in', values: ['y'], return: 'c' },
                ],
              },
            },
          })
        )
      ).toEqual(['environments.production.rules.0.return']);
    });
  });

  it('rejects duplicate apps and tags', () => {
    expect(paths(baseFlag({ apps: ['kibana', 'kibana'], tags: ['a', 'b', 'a'] }))).toEqual([
      'apps.1',
      'tags.2',
    ]);
  });

  describe('percentages', () => {
    const withPercentages = (percentages: Record<string, number>) =>
      baseFlag({
        environments: {
          production: {
            default: false,
            rules: [{ type: 'percentage', per_attribute: 'key', percentages }],
          },
        },
      });

    it('accepts percentages that add up to 100', () => {
      expect(paths(withPercentages({ true: 25, false: 75 }))).toEqual([]);
    });

    it('rejects percentages that do not add up to 100', () => {
      expect(validateFlagConsistency(withPercentages({ true: 25, false: 70 }))).toEqual([
        {
          path: 'environments.production.rules.0.percentages',
          message: 'Percentages must add up to 100, but they add up to 95.',
        },
      ]);
    });

    it('rejects keys that are not variations', () => {
      expect(paths(withPercentages({ true: 50, maybe: 50 }))).toEqual([
        'environments.production.rules.0.percentages.maybe',
      ]);
    });
  });

  describe('match rules', () => {
    const withRules = (rules: Rule[]) =>
      baseFlag({ environments: { production: { default: false, rules } } });

    it('requires either return or nested rules', () => {
      expect(
        paths(withRules([{ type: 'match', attribute: 'x', operator: 'in', values: ['y'] }]))
      ).toEqual(['environments.production.rules.0']);
    });

    it('rejects both return and nested rules', () => {
      expect(
        paths(
          withRules([
            {
              type: 'match',
              attribute: 'x',
              operator: 'in',
              values: ['y'],
              return: true,
              rules: [
                { type: 'match', attribute: 'z', operator: 'in', values: ['w'], return: true },
              ],
            },
          ])
        )
      ).toEqual(['environments.production.rules.0']);
    });

    it.each([[['9.3']], [['9.3.0', '9.4.0']], [[9]]])(
      'rejects semver operators with values %j',
      (values) => {
        expect(
          paths(
            withRules([
              { type: 'match', attribute: 'v', operator: 'semver_lt', values, return: true },
            ])
          )
        ).toEqual(['environments.production.rules.0.values']);
      }
    );

    it('limits the nesting depth', () => {
      let rule: Rule = {
        type: 'match',
        attribute: 'x',
        operator: 'in',
        values: ['y'],
        return: true,
      };
      for (let level = 0; level < 5; level++) {
        rule = { type: 'match', attribute: 'x', operator: 'in', values: ['y'], rules: [rule] };
      }
      expect(validateFlagConsistency(withRules([rule]))).toEqual([
        expect.objectContaining({
          message: 'Rules can be nested at most 5 levels deep.',
        }),
      ]);
    });
  });

  describe('prerequisites', () => {
    it('rejects the flag itself and duplicates', () => {
      expect(
        paths(
          baseFlag({
            environments: {
              production: {
                default: false,
                prerequisites: [
                  { flag: 'discover.cascadeLayoutEnabled', value: true },
                  { flag: 'other', value: true },
                  { flag: 'other', value: false },
                ],
              },
            },
          })
        )
      ).toEqual([
        'environments.production.prerequisites.0.flag',
        'environments.production.prerequisites.2.flag',
      ]);
    });
  });
});

describe('findPrerequisiteCycle', () => {
  it('returns undefined without a cycle', () => {
    const graph = new Map([
      ['a', ['b', 'c']],
      ['b', ['c']],
      ['c', []],
    ]);
    expect(findPrerequisiteCycle(graph, 'a')).toBeUndefined();
  });

  it('returns the cycle path', () => {
    const graph = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    expect(findPrerequisiteCycle(graph, 'a')).toEqual(['a', 'b', 'c', 'a']);
  });

  it('finds cycles that do not include the start', () => {
    const graph = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['b']],
    ]);
    expect(findPrerequisiteCycle(graph, 'a')).toEqual(['b', 'c', 'b']);
  });
});
