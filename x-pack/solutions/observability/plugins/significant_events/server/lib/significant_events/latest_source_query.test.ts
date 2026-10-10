/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { applyLifetimeOverlap, resolveTimeBound } from './latest_source_query';

describe('resolveTimeBound', () => {
  it('resolves date-math expressions to ISO', () => {
    const iso = resolveTimeBound('now-7d');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('rounds date-math expressions up when requested', () => {
    const start = resolveTimeBound('now/d');
    const end = resolveTimeBound('now/d', { roundUp: true });
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  it('passes full ISO timestamps through verbatim', () => {
    expect(resolveTimeBound('2026-07-23T10:00:00.000Z')).toBe('2026-07-23T10:00:00.000Z');
  });

  it('passes date-only strings through verbatim so Elasticsearch parses them as UTC', () => {
    expect(resolveTimeBound('2026-07-23')).toBe('2026-07-23');
    expect(resolveTimeBound('2026-07-23', { roundUp: true })).toBe('2026-07-23');
  });

  it('resolves anchored date-math (||) expressions to a rounded-up day end', () => {
    const start = resolveTimeBound('2026-07-23||/d');
    const end = resolveTimeBound('2026-07-23||/d', { roundUp: true });
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe('applyLifetimeOverlap', () => {
  const activeWhere = esql.exp`${esql.col('status')} IN (${[esql.str('open')]})`;

  const printOverlap = (range: { from?: string; to?: string }) =>
    applyLifetimeOverlap({ query: esql.from('events'), activeWhere, ...range }).toRequest();

  it('keeps entities created by `to` and still active or updated since `from`', () => {
    const { query, params } = printOverlap({
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-02T23:59:59.999Z',
    });

    expect(query).toBe(
      'FROM events | WHERE created_at <= TO_DATETIME(?overlapToIso) | WHERE (status IN ("open")) OR @timestamp >= TO_DATETIME(?overlapFromIso)'
    );
    expect(params).toEqual([
      { overlapToIso: '2026-01-02T23:59:59.999Z' },
      { overlapFromIso: '2026-01-02T00:00:00.000Z' },
    ]);
  });

  it('only bounds creation when `from` is omitted', () => {
    const { query } = printOverlap({ to: '2026-01-02T23:59:59.999Z' });

    expect(query).toBe('FROM events | WHERE created_at <= TO_DATETIME(?overlapToIso)');
  });

  it('only bounds the last update when `to` is omitted', () => {
    const { query } = printOverlap({ from: '2026-01-02T00:00:00.000Z' });

    expect(query).toBe(
      'FROM events | WHERE (status IN ("open")) OR @timestamp >= TO_DATETIME(?overlapFromIso)'
    );
  });

  it('leaves the query unchanged without a time range', () => {
    expect(printOverlap({}).query).toBe('FROM events');
  });

  it('rounds date-math `to` up and `from` down', () => {
    const { params } = printOverlap({ from: '2026-01-02||/d', to: '2026-01-02||/d' });

    expect(params).toEqual([
      { overlapToIso: resolveTimeBound('2026-01-02||/d', { roundUp: true }) },
      { overlapFromIso: resolveTimeBound('2026-01-02||/d') },
    ]);
  });
});
