/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YaraValidateResult } from './types';
import { sliceYaraRulesFromSource } from './slice_yara_rules';

const compiled = (
  identifier: string,
  sourceStart: number,
  sourceEnd: number
): YaraValidateResult['rules'][number] => ({
  identifier,
  meta: {},
  duplicateMeta: [],
  sourceStart,
  sourceEnd,
});

describe('sliceYaraRulesFromSource', () => {
  const source = 'import "pe"\n\nrule First { condition: true }\nrule Second { condition: true }';

  it('prepends imports and slices each compiled rule', () => {
    const first = 'rule First { condition: true }';
    const second = 'rule Second { condition: true }';
    const firstStart = source.indexOf(first);
    const secondStart = source.indexOf(second);

    expect(
      sliceYaraRulesFromSource(source, {
        errors: [],
        warnings: [],
        errorCount: 0,
        warningCount: 0,
        imports: ['pe'],
        rules: [
          compiled('First', firstStart, firstStart + first.length),
          compiled('Second', secondStart, secondStart + second.length),
        ],
      })
    ).toEqual([`import "pe"\n\n${first}`, `import "pe"\n\n${second}`]);
  });

  it('returns an empty list when there are no compiled rules', () => {
    expect(
      sliceYaraRulesFromSource(source, {
        errors: [],
        warnings: [],
        errorCount: 0,
        warningCount: 0,
        imports: ['pe'],
        rules: [],
      })
    ).toEqual([]);
  });

  it('throws when the source failed to compile', () => {
    expect(() =>
      sliceYaraRulesFromSource(source, {
        errors: [{ severity: 'error', message: 'syntax error', line: 1 }],
        warnings: [],
        errorCount: 1,
        warningCount: 0,
        imports: [],
        rules: [],
      })
    ).toThrow('Cannot flatten YARA source that failed to compile');
  });

  it('throws when a compiled rule is missing a source span', () => {
    expect(() =>
      sliceYaraRulesFromSource(source, {
        errors: [],
        warnings: [],
        errorCount: 0,
        warningCount: 0,
        imports: [],
        rules: [compiled('First', -1, -1)],
      })
    ).toThrow('Missing source span for YARA rule "First"');
  });
});
