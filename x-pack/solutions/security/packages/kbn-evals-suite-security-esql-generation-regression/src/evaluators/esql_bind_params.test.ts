/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_TEND, DEFAULT_TSTART, substituteEsqlBindParams } from './esql_bind_params';

describe('substituteEsqlBindParams', () => {
  it('returns the input unchanged when no bind tokens are present', () => {
    const query = 'FROM logs-* | LIMIT 10';
    expect(substituteEsqlBindParams(query)).toBe(query);
  });

  it('substitutes ?_tstart with the default lower bound as a quoted literal', () => {
    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart';
    expect(substituteEsqlBindParams(query)).toBe(
      `FROM logs-* | WHERE @timestamp >= "${DEFAULT_TSTART}"`
    );
  });

  it('substitutes ?_tend with the default upper bound as a quoted literal', () => {
    const query = 'FROM logs-* | WHERE @timestamp < ?_tend';
    expect(substituteEsqlBindParams(query)).toBe(
      `FROM logs-* | WHERE @timestamp < "${DEFAULT_TEND}"`
    );
  });

  it('substitutes both tokens within a single query', () => {
    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | LIMIT 10';
    expect(substituteEsqlBindParams(query)).toBe(
      `FROM logs-* | WHERE @timestamp >= "${DEFAULT_TSTART}" AND @timestamp < "${DEFAULT_TEND}" | LIMIT 10`
    );
  });

  it('substitutes every occurrence of each token (not just the first)', () => {
    const query =
      'FROM logs-* | WHERE @timestamp >= ?_tstart AND created >= ?_tstart AND @timestamp < ?_tend';
    const result = substituteEsqlBindParams(query);
    expect(result).not.toMatch(/\?_tstart/);
    expect(result).not.toMatch(/\?_tend/);
    expect(result.match(new RegExp(DEFAULT_TSTART, 'g'))).toHaveLength(2);
  });

  it('respects a per-call overrides argument', () => {
    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
    const result = substituteEsqlBindParams(query, {
      tstart: '2024-01-01T00:00:00.000Z',
      tend: '2024-12-31T23:59:59.999Z',
    });
    expect(result).toBe(
      'FROM logs-* | WHERE @timestamp >= "2024-01-01T00:00:00.000Z" AND @timestamp < "2024-12-31T23:59:59.999Z"'
    );
  });

  it('uses default values when overrides only supplies one bound', () => {
    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
    const result = substituteEsqlBindParams(query, { tstart: '2024-06-01T00:00:00.000Z' });
    expect(result).toContain('2024-06-01T00:00:00.000Z');
    expect(result).toContain(DEFAULT_TEND);
  });

  it('does not match longer identifiers that share the prefix (word boundary)', () => {
    const query = 'FROM logs-* | WHERE foo == ?_tstartfoo OR bar == ?_tendbar';
    expect(substituteEsqlBindParams(query)).toBe(query);
  });

  it('handles empty input gracefully', () => {
    expect(substituteEsqlBindParams('')).toBe('');
  });

  it('returns non-string inputs unchanged (defensive guard)', () => {
    // @ts-expect-error — exercising the defensive runtime check
    expect(substituteEsqlBindParams(null)).toBe(null);
    // @ts-expect-error — exercising the defensive runtime check
    expect(substituteEsqlBindParams(undefined)).toBe(undefined);
  });
});
