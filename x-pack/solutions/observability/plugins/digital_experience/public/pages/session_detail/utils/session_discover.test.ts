/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sessionEsqlQuery, sessionTimeRange } from './session_discover';

describe('sessionEsqlQuery', () => {
  it('reads every raw event of the session, in time order', () => {
    expect(sessionEsqlQuery({ serviceName: 'shop', sessionId: 'abc-123' })).toBe(
      [
        'FROM traces-*.otel-*, logs-*.otel-*',
        '  | WHERE session.id == "abc-123" AND service.name == "shop"',
        '  | SORT @timestamp ASC',
      ].join('\n')
    );
  });

  it('escapes what a name or an id holds, so that it stays a string', () => {
    expect(sessionEsqlQuery({ serviceName: 'a"b\\c', sessionId: 'x' })).toContain(
      'service.name == "a\\"b\\\\c"'
    );
  });
});

describe('sessionTimeRange', () => {
  it('spans the session, with a margin either side for events the summary is not up to date on', () => {
    expect(
      sessionTimeRange({
        startTime: '2026-10-20T10:00:00.000Z',
        endTime: '2026-10-20T10:01:00.000Z',
      })
    ).toEqual({ from: '2026-10-20T09:59:00.000Z', to: '2026-10-20T10:06:00.000Z' });
  });

  it.each([
    ['no start', '', '2026-10-20T10:01:00.000Z'],
    ['no end', '2026-10-20T10:00:00.000Z', ''],
    ['neither', '', ''],
  ])('has none for a session with %s, which the API returns as empty strings', (_, start, end) => {
    expect(sessionTimeRange({ startTime: start, endTime: end })).toBeUndefined();
  });
});
