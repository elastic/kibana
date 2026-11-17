/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bindSurroundingQuery, toEsqlLiteral } from './bind_surrounding_query';

describe('toEsqlLiteral', () => {
  it('quotes and escapes strings', () => {
    expect(toEsqlLiteral('plain')).toBe('"plain"');
    expect(toEsqlLiteral('C:\\users\\user\\a.exe')).toBe('"C:\\\\users\\\\user\\\\a.exe"');
    expect(toEsqlLiteral('say "hi"')).toBe('"say \\"hi\\""');
    expect(toEsqlLiteral('a\nb\tc\r')).toBe('"a\\nb\\tc\\r"');
  });

  it('keeps a value from closing the literal and adding syntax', () => {
    expect(toEsqlLiteral('x" or 1 == 1 //')).toBe('"x\\" or 1 == 1 //"');
    expect(toEsqlLiteral('x\\')).toBe('"x\\\\"');
  });

  it('renders numbers and booleans bare', () => {
    expect(toEsqlLiteral(443)).toBe('443');
    expect(toEsqlLiteral(-2.5)).toBe('-2.5');
    expect(toEsqlLiteral(true)).toBe('true');
  });

  it('rejects non-finite, exponent and oversized values', () => {
    expect(() => toEsqlLiteral(Number.NaN)).toThrow('finite');
    expect(() => toEsqlLiteral(Number.POSITIVE_INFINITY)).toThrow('finite');
    expect(() => toEsqlLiteral(1e30)).toThrow('out of range');
    expect(() => toEsqlLiteral('x'.repeat(1025))).toThrow('exceeds');
    expect(toEsqlLiteral('x'.repeat(1024))).toHaveLength(1026);
  });
});

describe('bindSurroundingQuery', () => {
  const query =
    'from a METADATA _index, _id | where @timestamp >= {{param.bucket_start}} and @timestamp < {{param.bucket_end}} | where process.name == {{param.process.name}} and destination.port == {{param.destination.port}}';
  const keyFields = ['process.name', 'destination.port'];
  const params = {
    bucket_start: '2026-10-30T00:00:00.000Z',
    bucket_end: '2026-10-31T00:00:00.000Z',
    'process.name': 'curl',
    'destination.port': 443,
  };

  it('binds typed literals', () => {
    expect(bindSurroundingQuery({ query, keyFields, params })).toBe(
      'from a METADATA _index, _id | where @timestamp >= "2026-10-30T00:00:00.000Z" and @timestamp < "2026-10-31T00:00:00.000Z" | where process.name == "curl" and destination.port == 443'
    );
  });

  it('rejects a missing placeholder value', () => {
    const { 'destination.port': omitted, ...rest } = params;

    expect(() => bindSurroundingQuery({ query, keyFields, params: rest })).toThrow(
      'Missing surrounding query parameter(s): destination.port'
    );
  });

  it('rejects a parameter that is not a key field or bind', () => {
    expect(() =>
      bindSurroundingQuery({ query, keyFields, params: { ...params, 'host.name': 'h' } })
    ).toThrow('Unexpected surrounding query parameter(s): host.name');
  });

  it('does not re-expand placeholder text inside a bound value', () => {
    const bound = bindSurroundingQuery({
      query: 'from a METADATA _index, _id | where x == {{param.k}} and y == {{param.group_id}}',
      keyFields: ['k'],
      params: { k: '{{param.group_id}}', group_id: 'g' },
    });

    expect(bound).toBe(
      'from a METADATA _index, _id | where x == "{{param.group_id}}" and y == "g"'
    );
  });

  it('accepts extra supplied binds the query does not use', () => {
    expect(
      bindSurroundingQuery({
        query: 'from a | where x == {{param.k}}',
        keyFields: ['k'],
        params: { k: 'v', group_id: 'g' },
      })
    ).toBe('from a | where x == "v"');
  });
});
