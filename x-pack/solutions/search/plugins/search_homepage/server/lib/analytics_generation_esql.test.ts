/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkGeneratedEsql } from './analytics_generation_esql';

const SOURCE = 'app-events';
const check = (query: string, allowTimeRangeParams = false) =>
  checkGeneratedEsql(query, SOURCE, { allowTimeRangeParams });

describe('checkGeneratedEsql', () => {
  it('accepts a query that reads the source with allowed commands', () => {
    expect(
      check(
        'FROM app-events\n| WHERE status IS NOT NULL\n| STATS failed = COUNT(*) WHERE status == "failed", total = COUNT(*) BY day = BUCKET(@timestamp, 1 day)\n| EVAL rate = ROUND(100.0 * failed / total, 1)\n| INLINE STATS all = SUM(total)\n| SORT day\n| KEEP day, rate\n| LIMIT 10'
      )
    ).toEqual({ ok: true, fromEnd: 15, usesTimeRangeParams: false });
  });

  it('accepts a source name that has to be quoted', () => {
    expect(
      checkGeneratedEsql('FROM "my events" | LIMIT 1', 'my events', { allowTimeRangeParams: false })
    ).toMatchObject({
      ok: true,
    });
  });

  it.each([
    ['another index', 'FROM .kibana | LIMIT 10'],
    ['a second index', 'FROM app-events, secrets | LIMIT 10'],
    ['a pattern', 'FROM app-* | LIMIT 10'],
    ['a remote cluster', 'FROM remote:app-events | LIMIT 10'],
  ])('refuses %s', (_, query) => {
    expect(check(query)).toEqual({
      ok: false,
      reason: 'The query must read from app-events and from nothing else.',
    });
  });

  it.each([
    ['LOOKUP JOIN', 'FROM app-events | LOOKUP JOIN secrets ON id | LIMIT 1', 'JOIN'],
    ['ENRICH', 'FROM app-events | ENRICH users ON user_id', 'ENRICH'],
    [
      'COMPLETION',
      'FROM app-events | COMPLETION "say hi" WITH {"inference_id": "x"}',
      'COMPLETION',
    ],
    ['FORK', 'FROM app-events | FORK (WHERE a > 1) (WHERE a < 1)', 'FORK'],
  ])('refuses the %s command', (_, query, command) => {
    expect(check(query)).toEqual({ ok: false, reason: `The ${command} command is not allowed.` });
  });

  it('refuses a query that does not start with FROM', () => {
    expect(check('ROW a = 1')).toEqual({
      ok: false,
      reason: 'The query must start with FROM app-events.',
    });
    expect(check('SHOW INFO')).toMatchObject({ ok: false });
  });

  it('refuses a source hidden in a subquery', () => {
    expect(check('FROM app-events | WHERE user IN (FROM secrets | KEEP user)')).toMatchObject({
      ok: false,
    });
    expect(check('FROM app-events, (FROM secrets | LIMIT 1) | LIMIT 2')).toMatchObject({
      ok: false,
    });
  });

  it('refuses a query that does not parse or is too long', () => {
    expect(check('FROM app-events\nSTATS c = COUNT(*)')).toEqual({
      ok: false,
      reason: expect.stringContaining('Syntax error'),
    });
    expect(check(`FROM app-events | WHERE a == "${'x'.repeat(2000)}"`)).toEqual({
      ok: false,
      reason: 'The query is longer than 2000 characters.',
    });
  });

  it('lets only panel queries read the dashboard time range, and no other parameter', () => {
    const timeSeries =
      'FROM app-events | STATS events = COUNT(*) BY bucket = BUCKET(@timestamp, 30, ?_tstart, ?_tend)';

    expect(check(timeSeries, true)).toMatchObject({ ok: true, usesTimeRangeParams: true });
    expect(check(timeSeries)).toEqual({
      ok: false,
      reason: 'This query must not use ?_tstart or ?_tend.',
    });
    expect(check('FROM app-events | WHERE user == ?user', true)).toEqual({
      ok: false,
      reason: 'Only the ?_tstart and ?_tend parameters exist.',
    });
    expect(check('FROM app-events | WHERE user == ?', true)).toMatchObject({ ok: false });
  });
});
