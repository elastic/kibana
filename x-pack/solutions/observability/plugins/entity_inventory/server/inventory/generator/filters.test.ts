/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { k8sDeploymentFixture } from '../__fixtures__/definitions';
import { InventoryDefinitionError } from './errors';
import { assertEsqlFilter, validateEsqlFilter } from './filters';

describe('validateEsqlFilter', () => {
  it.each([
    ['a comparison', '`kubernetes.namespace` == "default"'],
    ['AND and OR', '`a` == 1 AND (`b` == 2 OR `c` IS NOT NULL)'],
    ['a function', 'STARTS_WITH(`host.name`, "prod-")'],
    ['a boolean field', '`kubernetes.pod.ready`'],
  ])('accepts %s', (_, filter) => {
    expect(validateEsqlFilter(filter)).toBeUndefined();
  });

  it.each([
    ['a pipe', '`a` == 1 | LIMIT 1', 'must not contain a pipe'],
    ['a trailing LIMIT', '`a` == 1 AND `b` == 2 | LIMIT 1', 'must not contain a pipe'],
    ['two commands', '`a` == 1 | WHERE `b` == 2', 'must not contain a pipe'],
    ['a pipe inside a string', '`a` == "x|y"', 'must not contain a pipe'],
    ['a semicolon', '`a` == 1; FROM y', 'must not contain a semicolon'],
    ['a line comment', '`a` == 1 // and more', 'must not contain a line comment'],
    ['a block comment', '`a` == 1 /* hidden */', 'must not contain a block comment'],
    ['a block comment end', '`a` == 1 */', 'must not contain a block comment'],
    ['an unparsable string', '`a` ==', 'does not parse'],
    ['an unbalanced parenthesis', '`a` == 1) OR (true', 'does not parse'],
    ['two expressions', '`a` == 1, `b` == 2', 'does not parse'],
    ['a non-boolean fragment', 'foo bar', 'does not parse'],
    ['a numeric literal', '1', 'must be a boolean expression, not a integer literal'],
    ['a string literal', '"foo"', 'must be a boolean expression, not a keyword literal'],
    ['a query parameter', '`a` == ?from', 'must not contain query parameters'],
  ])('rejects %s', (_, filter, problem) => {
    expect(validateEsqlFilter(filter)).toContain(`source filter ${problem}`);
  });

  it('accepts the source filter of the k8s.deployment fixture', () => {
    const filters = (k8sDeploymentFixture.dynamic?.sources ?? []).flatMap(({ filter }) =>
      filter === undefined ? [] : [filter]
    );
    expect(filters).toHaveLength(1);
    expect(validateEsqlFilter(filters[0])).toBeUndefined();
  });

  it('includes the filter text in the problem', () => {
    expect(validateEsqlFilter('`a` == 1 | LIMIT 1')).toContain('`a` == 1 | LIMIT 1');
  });

  it('includes the parser message when the filter does not parse', () => {
    expect(validateEsqlFilter('`a` ==')).toMatch(/^source filter does not parse: SyntaxError: /);
  });

  it('names the filter with the given label', () => {
    expect(validateEsqlFilter('`a` == 1; FROM y', 'filter of metric "cpu"')).toMatch(
      /^filter of metric "cpu" must not contain a semicolon/
    );
  });
});

describe('assertEsqlFilter', () => {
  it('accepts a valid filter', () => {
    expect(() => assertEsqlFilter('`a` == 1')).not.toThrow();
  });

  it('throws an InventoryDefinitionError with the problem and the label', () => {
    expect(() => assertEsqlFilter('`a` == 1 | LIMIT 1', 'filter of metric "cpu"')).toThrow(
      InventoryDefinitionError
    );
    expect(() => assertEsqlFilter('`a` == 1 | LIMIT 1', 'filter of metric "cpu"')).toThrow(
      'filter of metric "cpu" must not contain a pipe: `a` == 1 | LIMIT 1'
    );
  });
});
