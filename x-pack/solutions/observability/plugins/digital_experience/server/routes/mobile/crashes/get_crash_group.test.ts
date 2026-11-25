/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getCrashGroup } from './get_crash_group';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse('2021-01-18T12:00:00.000Z');
const END = Date.parse('2021-01-18T13:00:00.000Z');
const CRASH_TIME = '2021-01-18T12:30:00.000Z';

const LATEST = {
  crash_time: CRASH_TIME,
  reported_at: '2021-01-18T12:45:00.000Z',
  exception_type: 'SIGTRAP',
  message: 'TRAP_BRKPT at 4385823488',
  stacktrace: 'Thread 0 Crashed:\n0   RideIos   0x1 0x0 + 1',
  release: '8.5.0',
  session_id: 'DF831C22-A367',
};

describe('getCrashGroup', () => {
  it("returns the latest crash, the breakdowns and the session's events before the crash", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) => {
      if (query.includes('LIMIT 1 |')) {
        return esqlResponse([LATEST]);
      }
      if (query.includes('BY value = `service.version`')) {
        // The top values and the crashes without a release, as the query cuts them; the total also
        // counts 8.1.0's 4 crashes, which the limit left out.
        return esqlResponse(
          ['8.5.0', '8.4.1', '8.4.0', '8.3.0', '8.2.0', null].map((value, index) => ({
            value,
            count: 10 - index,
            total: 49,
          }))
        );
      }
      if (query.includes('BY value =')) {
        return esqlResponse([{ value: '18.1', count: 3, total: 3 }]);
      }
      // The session's events, newest first, with the timeline's fields the query computes.
      return esqlResponse([
        {
          '@timestamp': '2021-01-18T12:29:59.000Z',
          event_kind: 'log',
          name: 'ERROR',
          detail: 'Transfer failed',
          page: 'Transfer',
        },
        {
          '@timestamp': '2021-01-18T12:29:58.000Z',
          event_kind: 'request',
          name: 'POST',
          detail: 'https://api/transfers',
          status_code: 503,
          duration_ms: 420,
          page: 'Transfer',
          trace_id: 't1',
          span_id: 's1',
        },
        {
          '@timestamp': '2021-01-18T12:29:57.000Z',
          event_kind: 'tap',
          name: 'Send money',
          page: 'Transfer',
        },
        {
          '@timestamp': '2021-01-18T12:29:56.000Z',
          event_kind: 'screen',
          name: 'Transfer',
          page: 'Transfer',
        },
        {
          '@timestamp': '2021-01-18T12:29:55.000Z',
          event_kind: 'error',
          name: 'IOException',
          detail: 'timeout',
          stacktrace: 'IOException: timeout',
        },
      ]);
    });

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios', osName: 'iOS' },
      fingerprint: 'abc',
      start: START,
      end: END,
    });

    expect(detail.latestCrash).toEqual({
      time: CRASH_TIME,
      reportedAt: '2021-01-18T12:45:00.000Z',
      type: 'SIGTRAP',
      message: 'TRAP_BRKPT at 4385823488',
      stacktrace: LATEST.stacktrace,
      release: '8.5.0',
      sessionId: 'DF831C22-A367',
    });
    // The top 5, the rest and the crashes without a release as "Other".
    expect(detail.releases).toEqual({
      top: [
        { key: '8.5.0', count: 10 },
        { key: '8.4.1', count: 9 },
        { key: '8.4.0', count: 8 },
        { key: '8.3.0', count: 7 },
        { key: '8.2.0', count: 6 },
      ],
      other: 9,
    });
    expect(detail.osVersions).toEqual({ top: [{ key: '18.1', count: 3 }], other: 0 });
    // The browser's timeline shape, the first event listed at offset 0.
    const event = (fields: Record<string, unknown>) => ({
      page: null,
      detail: null,
      clickCount: null,
      stacktrace: null,
      traceId: null,
      spanId: null,
      statusCode: null,
      durationMs: null,
      ...fields,
    });
    expect(detail.beforeCrash).toEqual([
      event({
        kind: 'error',
        name: 'IOException',
        timestamp: '2021-01-18T12:29:55.000Z',
        offsetMs: 0,
        detail: 'timeout',
        stacktrace: 'IOException: timeout',
      }),
      event({
        kind: 'screen',
        name: 'Transfer',
        timestamp: '2021-01-18T12:29:56.000Z',
        offsetMs: 1000,
        page: 'Transfer',
      }),
      event({
        kind: 'tap',
        name: 'Send money',
        timestamp: '2021-01-18T12:29:57.000Z',
        offsetMs: 2000,
        page: 'Transfer',
      }),
      event({
        kind: 'request',
        name: 'POST',
        timestamp: '2021-01-18T12:29:58.000Z',
        offsetMs: 3000,
        page: 'Transfer',
        detail: 'https://api/transfers',
        traceId: 't1',
        spanId: 's1',
        statusCode: 503,
        durationMs: 420,
      }),
      event({
        kind: 'log',
        name: 'ERROR',
        timestamp: '2021-01-18T12:29:59.000Z',
        offsetMs: 4000,
        page: 'Transfer',
        detail: 'Transfer failed',
      }),
    ]);

    const requests = client.esql.query.mock.calls.map(([request]) => request);
    // Each query has its own commands: none piped onto another's.
    expect(requests.filter(({ query }) => query.includes('| LIMIT 1 |'))).toHaveLength(1);
    // The session is read over its longest length before the crash, in every environment.
    const eventsRequest = requests[requests.length - 1];
    const crashMs = Date.parse(CRASH_TIME);
    expect(eventsRequest.filter).toEqual({
      bool: {
        filter: [
          {
            range: { '@timestamp': { gte: crashMs - DAY, lt: crashMs, format: 'epoch_millis' } },
          },
          expect.anything(),
        ],
      },
    });
    expect(eventsRequest.params).toEqual(
      expect.arrayContaining([{ session_id_upper: 'DF831C22-A367' }, { before: CRASH_TIME }])
    );
  });

  it('has no events before a crash without a session, and nothing without a crash', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(query.includes('LIMIT 1 |') ? [{ ...LATEST, session_id: null }] : [])
    );

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: 'abc',
      start: START,
      end: END,
    });

    expect(detail.latestCrash?.sessionId).toBeNull();
    expect(detail.beforeCrash).toEqual([]);
    expect(detail.deviceModels).toEqual({ top: [], other: 0 });
    // The latest crash and the three breakdowns; no session query.
    expect(client.esql.query).toHaveBeenCalledTimes(4);
  });
});
