/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertParses } from './parse_guard';

const SET_PREFIX = 'SET unmapped_fields="nullify";';

describe('assertParses', () => {
  it('accepts a query with the SET prefix', () => {
    expect(() =>
      assertParses(
        `${SET_PREFIX}\nFROM metrics-*\n| WHERE @timestamp >= ?from AND @timestamp < ?to\n| STATS \`last_seen\` = MAX(@timestamp) BY \`host.name\`\n| SORT \`last_seen\` DESC NULLS LAST | LIMIT 10000`
      )
    ).not.toThrow();
  });

  it('throws a plain Error with the parser message and the query text', () => {
    const esql = `${SET_PREFIX}\nFROM metrics-*\n| WHERE last == 1`;
    expect(() => assertParses(esql)).toThrow(
      expect.objectContaining({
        name: 'Error',
        message: expect.stringMatching(/^generated ES\|QL does not parse: SyntaxError: /),
      })
    );
    expect(() => assertParses(esql)).toThrow(esql);
  });
});
