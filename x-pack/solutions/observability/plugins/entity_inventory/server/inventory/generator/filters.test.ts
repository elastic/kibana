/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { k8sDeploymentFixture } from '../__fixtures__/definitions';
import { InventoryDefinitionError } from './errors';
import { canonicalizeEsqlFilter } from './filters';

describe('canonicalizeEsqlFilter', () => {
  it.each([
    ['a comparison', '`kubernetes.namespace` == "default"'],
    ['AND and OR', '`a` == 1 AND (`b` == 2 OR `c` IS NOT NULL)'],
    ['a function', 'STARTS_WITH(`host.name`, "prod-")'],
    ['a boolean field', '`kubernetes.pod.ready`'],
  ])('accepts %s', (_, filter) => {
    expect(canonicalizeEsqlFilter(filter)).toEqual(expect.any(String));
  });

  it('normalises whitespace', () => {
    const compact = canonicalizeEsqlFilter('state=="idle"');
    expect(compact).toBe('state == "idle"');
    expect(canonicalizeEsqlFilter('state == "idle"')).toBe(compact);
  });

  it('keeps a URL in a string literal intact', () => {
    const canonical = canonicalizeEsqlFilter('url.full == "http://example.com/a//b"');
    expect(canonical).toContain('"http://example.com/a//b"');
  });

  it('drops a trailing comment', () => {
    expect(canonicalizeEsqlFilter('a == 1 // trailing comment')).toBe('a == 1');
  });

  it('drops a block comment', () => {
    expect(canonicalizeEsqlFilter('a == 1 /* hidden */')).toBe('a == 1');
  });

  it('keeps a pipe inside a string literal', () => {
    expect(canonicalizeEsqlFilter('a == "x|y"')).toBe('a == "x|y"');
  });

  it("keeps the author's parentheses", () => {
    expect(canonicalizeEsqlFilter('(a == 1 OR b == 2) AND c == 3')).toBe(
      '(a == 1 OR b == 2) AND c == 3'
    );
  });

  it('round-trips the source filter of the k8s.deployment fixture', () => {
    const filters = (k8sDeploymentFixture.dynamic?.sources ?? []).flatMap(({ filter }) =>
      filter === undefined ? [] : [filter]
    );
    expect(filters).toEqual(['metricset.name == "state_deployment"']);
    expect(canonicalizeEsqlFilter(filters[0])).toBe(filters[0]);
  });

  it.each([
    ['a pipe-separated second command', 'a == 1 | LIMIT 1', 'must be a single ES|QL expression'],
    ['a semicolon', 'a == 1; b == 2', 'must be a single ES|QL expression'],
    ['a comma-separated pair', 'a == 1, b == 2', 'must be a single ES|QL expression'],
    ['a non-boolean fragment', 'foo bar', 'must be a single ES|QL expression'],
    ['an unparsable string', '`a` ==', 'must be a single ES|QL expression'],
    ['an unbalanced parenthesis', '(a == 1', 'must be a single ES|QL expression'],
    ['a closing parenthesis too many', '`a` == 1) OR (true', 'must be a single ES|QL expression'],
    ['a query parameter', '`a` == ?from', 'must not contain query parameters'],
    ['a string literal', '"foo"', 'must be a boolean expression, not a keyword literal'],
    ['a numeric literal', '1', 'must be a boolean expression, not a integer literal'],
  ])('rejects %s', (_, filter, problem) => {
    expect(() => canonicalizeEsqlFilter(filter)).toThrow(InventoryDefinitionError);
    expect(() => canonicalizeEsqlFilter(filter)).toThrow(`source filter ${problem}`);
  });

  it('includes the filter text in the message', () => {
    expect(() => canonicalizeEsqlFilter('a == 1 | LIMIT 1')).toThrow(/: a == 1 \| LIMIT 1$/);
  });

  it('includes the parser syntax error when there is one', () => {
    expect(() => canonicalizeEsqlFilter('`a` ==')).toThrow(
      /^source filter must be a single ES\|QL expression: SyntaxError: /
    );
  });

  it('names the filter with the given label', () => {
    expect(() => canonicalizeEsqlFilter('a == 1; b == 2', 'filter of metric "cpu"')).toThrow(
      /^filter of metric "cpu" must be a single ES\|QL expression/
    );
    expect(() => canonicalizeEsqlFilter('`a` == ?p', 'filter of metric "cpu"')).toThrow(
      /^filter of metric "cpu" must not contain query parameters/
    );
  });
});
