/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { INVENTORY_DEFINITION_FIXTURES } from '../__fixtures__/definitions';
import { InventoryDefinitionError } from './errors';
import { assertSafeIndexPattern, isSafeIndexPattern, quoteIdentifier } from './esql_syntax';

describe('quoteIdentifier', () => {
  it('quotes a plain path', () => {
    expect(quoteIdentifier('host.name')).toBe('`host.name`');
  });

  it('quotes a reserved word so that it parses', () => {
    expect(quoteIdentifier('last')).toBe('`last`');
    expect(Parser.parse(`FROM x | WHERE ${quoteIdentifier('last')} == 1`).errors).toEqual([]);
  });

  it('quotes a numeric path segment so that it parses', () => {
    expect(quoteIdentifier('system.load.1')).toBe('`system.load.1`');
    expect(Parser.parse(`FROM x | WHERE ${quoteIdentifier('system.load.1')} > 1`).errors).toEqual(
      []
    );
  });

  it('doubles an embedded backtick', () => {
    expect(quoteIdentifier('a`b')).toBe('`a``b`');
    expect(Parser.parse(`FROM x | WHERE ${quoteIdentifier('a`b')} == 1`).errors).toEqual([]);
  });
});

describe('isSafeIndexPattern', () => {
  it.each([
    ['letters', 'metrics'],
    ['upper case letters', 'Metrics'],
    ['digits', 'logs2024'],
    ['an underscore', 'my_index'],
    ['a dot', 'metrics.kubernetes'],
    ['a dash', 'metrics-kubernetes'],
    ['a star', 'metrics-*'],
    ['a question mark', 'metrics-?'],
    ['a colon', 'remote:metrics-*'],
  ])('accepts %s', (_, pattern) => {
    expect(isSafeIndexPattern(pattern)).toBe(true);
  });

  it.each([
    ['a leading dash', '-metrics'],
    ['a space', 'metrics *'],
    ['a comma', 'metrics-*,logs-*'],
    ['an empty string', ''],
    ['a pipe', 'metrics | DROP x'],
  ])('rejects %s', (_, pattern) => {
    expect(isSafeIndexPattern(pattern)).toBe(false);
  });
});

describe('assertSafeIndexPattern', () => {
  it('accepts a safe pattern', () => {
    expect(() => assertSafeIndexPattern('metrics-kubernetes*')).not.toThrow();
  });

  it('throws an InventoryDefinitionError naming the pattern', () => {
    expect(() => assertSafeIndexPattern('metrics-*,logs-*')).toThrow(InventoryDefinitionError);
    expect(() => assertSafeIndexPattern('metrics-*,logs-*')).toThrow('"metrics-*,logs-*"');
  });

  it.each([
    ['a star suffix', 'logs-*'],
    ['a dataset with a dot', 'metrics-kubernetes.state_deployment-*'],
    ['a backing index', '.ds-logs-2026.10.19-000001'],
    ['a failure store selector', 'logs-*::failures'],
    ['a lone star', '*'],
  ])('accepts %s', (_, pattern) => {
    expect(() => assertSafeIndexPattern(pattern)).not.toThrow();
  });

  it('rejects a pattern that passes the character set but does not parse', () => {
    expect(isSafeIndexPattern('a:b:c')).toBe(true);
    expect(() => assertSafeIndexPattern('a:b:c')).toThrow(InventoryDefinitionError);
    expect(() => assertSafeIndexPattern('a:b:c')).toThrow(
      /^index pattern does not parse as an ES\|QL source: .*"a:b:c"$/s
    );
  });

  it.each(
    INVENTORY_DEFINITION_FIXTURES.flatMap(({ dynamic }) =>
      (dynamic?.sources ?? []).map(({ indexPattern }) => [indexPattern])
    )
  )('accepts the fixture pattern %s', (pattern) => {
    expect(() => assertSafeIndexPattern(pattern)).not.toThrow();
  });
});
