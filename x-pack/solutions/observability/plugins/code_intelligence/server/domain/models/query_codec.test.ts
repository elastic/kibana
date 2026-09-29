/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryValidator } from '../ports/query_validator';
import { esqlFieldName, esqlStringLiteral, queryTemplateRt } from './query_codec';

/** Compares two types without relying on framework-specific type assertions. */
type Equal<Left, Right> = [Left] extends [Right] ? ([Right] extends [Left] ? true : false) : false;

/** Provides a representative valid concrete query for codec tests. */
const template = {
  description: 'Finds emitted payment errors.',
  evidence: [{ excerpt: 'logger.error(message)', line: 4, path: 'src/payment.ts' }],
  query: 'FROM logs* | WHERE MATCH_PHRASE(message, "payment failed")',
  signalType: 'log' as const,
  title: 'Payment error',
};

describe('query contracts', () => {
  it('makes QueryValidator accept a concrete ES|QL string', () => {
    const acceptsString: Equal<Parameters<QueryValidator['validate']>[0], string> = true;
    expect(acceptsString).toBe(true);
    expect(queryTemplateRt.decode(template)._tag).toBe('Right');
  });

  it('accepts ordinary ES|QL braces, array brackets, and workflow delimiter text', () => {
    for (const query of [
      'FROM logs* | DISSECT message "%{clientip} %{ident}" | WHERE note == "{literal}"',
      'FROM logs* | WHERE value IN [1, 2]',
      'FROM logs* | WHERE note == "{{workflow}}"',
    ]) {
      expect(queryTemplateRt.decode({ ...template, query })._tag).toBe('Right');
    }
  });

  it.each([
    ['empty query', ''],
    ['whitespace-only query', '   '],
    ['stale source placeholder', 'FROM [[source]] | LIMIT 1'],
    ['stale field placeholder', 'FROM logs* | WHERE [[field]] IS NOT NULL'],
    ['dangling open delimiter', 'FROM logs* | WHERE note == "[["'],
    ['dangling close delimiter', 'FROM logs* | WHERE note == "]]"'],
  ])('rejects %s', (_name, query) => {
    expect(queryTemplateRt.decode({ ...template, query })._tag).toBe('Left');
  });
});

describe('esqlStringLiteral', () => {
  it('escapes backslashes and double quotes', () => {
    expect(esqlStringLiteral('say "hi" \\ there')).toBe('"say \\"hi\\" \\\\ there"');
  });
});

describe('esqlFieldName', () => {
  it.each([
    ['attributes.http.request.method', 'attributes.http.request.method'],
    ['@timestamp', '@timestamp'],
    ['status.code', 'status.code'],
    ['metrics._internal_1', 'metrics._internal_1'],
  ])('renders %s bare', (name, expected) => {
    expect(esqlFieldName(name)).toBe(expected);
  });

  it.each([
    ['attributes.my-attr', '`attributes.my-attr`'],
    ['metrics.1xx', '`metrics.1xx`'],
    ['attributes.a b', '`attributes.a b`'],
    ['attributes..empty', '`attributes..empty`'],
    ['attributes.tick`name', '`attributes.tick``name`'],
    ['metrics.😀', '`metrics.😀`'],
  ])('backtick-quotes %s', (name, expected) => {
    expect(esqlFieldName(name)).toBe(expected);
  });
});
