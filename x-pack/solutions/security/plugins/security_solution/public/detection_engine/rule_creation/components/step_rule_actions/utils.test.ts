/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRuleInterval } from './utils';

describe('transformRuleInterval', () => {
  test('returns [number, string] tuple for valid interval', () => {
    expect(transformRuleInterval('5m')).toEqual([5, 'm']);
    expect(transformRuleInterval('10h')).toEqual([10, 'h']);
    expect(transformRuleInterval('30s')).toEqual([30, 's']);
    expect(transformRuleInterval('1d')).toEqual([1, 'd']);
  });

  test('returns undefined for invalid interval', () => {
    expect(transformRuleInterval(undefined)).toBeUndefined();
    expect(transformRuleInterval('')).toBeUndefined();
    expect(transformRuleInterval('5')).toBeUndefined();
    expect(transformRuleInterval('m5')).toBeUndefined();
    expect(transformRuleInterval('5 m')).toBeUndefined();
    expect(transformRuleInterval('5-m')).toBeUndefined();
    expect(transformRuleInterval('abc')).toBeUndefined();
    expect(transformRuleInterval(undefined)).toBeUndefined();
    expect(transformRuleInterval('10 ')).toBeUndefined();
    expect(transformRuleInterval(' 10m')).toBeUndefined();
    expect(transformRuleInterval('10m ')).toBeUndefined();
    expect(transformRuleInterval('5a')).toBeUndefined();
  });
});
