/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRASH_FINGERPRINT_CASES } from '../../../../common/mobile/crash_fingerprint.test_helpers';
import {
  createTracedEsClientMock,
  esqlResponse,
} from '../../../lib/create_digital_experience_traced_es_client.test_helpers';
import { getCrashGroup } from './get_crash_group';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse('2021-01-18T12:00:00.000Z');
const END = Date.parse('2021-01-18T13:00:00.000Z');
const CRASH_TIME = '2021-01-18T12:30:00.000Z';
const FINGERPRINT = 'a'.repeat(64);

const LATEST = {
  happened_at: CRASH_TIME,
  reported_at: '2021-01-18T12:45:00.000Z',
  exception_type: 'SIGTRAP',
  message: 'TRAP_BRKPT at 4385823488',
  stacktrace: CRASH_FINGERPRINT_CASES.iosLaunchA.stacktrace,
  release: '8.5.0',
  os_version: '18.1',
  device_model: 'iPhone 12',
  session_id: 'DF831C22-A367',
};

describe('getCrashGroup', () => {
  it("returns the latest crash, the breakdowns and the session's events before the crash", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) => {
      if (query.includes('LIMIT 1 |')) {
        return esqlResponse([LATEST]);
      }
      if (query.includes('BY value = crash_release')) {
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
      fingerprint: FINGERPRINT,
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
      osVersion: '18.1',
      deviceModel: 'iPhone 12',
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
    // The breakdowns only fingerprint the crashes of the latest one's type, or stored ones; the
    // latest crash, which finds that type, fingerprints them all.
    const breakdownRequests = requests.filter(({ query }) => query.includes('BY value ='));
    expect(breakdownRequests).toHaveLength(3);
    breakdownRequests.forEach(({ query }) =>
      expect(query).toContain(
        'WHERE `attributes.elastic.error.grouping_key` IS NOT NULL OR (`attributes.exception.type` IN ("SIGTRAP"))'
      )
    );
    expect(requests[0].query).not.toContain('`attributes.exception.type` IN');
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

  it('reads the session before when a crash sent days later happened, not when it was sent', async () => {
    const { client, esClient } = createTracedEsClientMock();
    const happenedAt = '2021-01-16T12:30:00.000Z';
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(
        query.includes('LIMIT 1 |')
          ? [{ ...LATEST, happened_at: happenedAt, reported_at: CRASH_TIME }]
          : []
      )
    );

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      start: START,
      end: END,
    });

    expect(detail.latestCrash).toMatchObject({ time: happenedAt, reportedAt: CRASH_TIME });
    const requests = client.esql.query.mock.calls.map(([request]) => request);
    const eventsRequest = requests[requests.length - 1];
    const happenedMs = Date.parse(happenedAt);
    expect(eventsRequest.filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': { gte: happenedMs - DAY, lt: happenedMs, format: 'epoch_millis' },
            },
          },
          expect.anything(),
        ],
      },
    });
    expect(eventsRequest.params).toEqual(expect.arrayContaining([{ before: happenedAt }]));
  });

  it('runs nothing after the latest crash query when the group has no crash', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([]));

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      start: START,
      end: END,
    });

    expect(detail).toEqual({
      latestCrash: null,
      releases: { top: [], other: 0 },
      osVersions: { top: [], other: 0 },
      deviceModels: { top: [], other: 0 },
      beforeCrash: [],
    });
    expect(client.esql.query).toHaveBeenCalledTimes(1);
  });

  it('has no events before a crash without a session', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(query.includes('LIMIT 1 |') ? [{ ...LATEST, session_id: null }] : [])
    );

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      start: START,
      end: END,
    });

    expect(detail.latestCrash?.sessionId).toBeNull();
    expect(detail.beforeCrash).toEqual([]);
    expect(detail.deviceModels).toEqual({ top: [], other: 0 });
    // The latest crash and the three breakdowns; no session query.
    expect(client.esql.query).toHaveBeenCalledTimes(4);
  });

  it('counts an empty value in "Other", not as a blank one', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) => {
      if (query.includes('LIMIT 1 |')) {
        return esqlResponse([{ ...LATEST, session_id: null }]);
      }
      return esqlResponse(
        query.includes('BY value =')
          ? [
              { value: 'Pixel 8', count: 3, total: 5 },
              { value: '', count: 2, total: 5 },
            ]
          : []
      );
    });

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      start: START,
      end: END,
    });

    expect(detail.deviceModels).toEqual({ top: [{ key: 'Pixel 8', count: 3 }], other: 2 });
  });

  it("fingerprints the crashes of every type when the latest crash's fingerprint was stored", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(
        query.includes('LIMIT 1 |')
          ? [{ ...LATEST, session_id: null, stored_fingerprint: FINGERPRINT }]
          : []
      )
    );

    await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      start: START,
      end: END,
    });

    const breakdownRequests = client.esql.query.mock.calls
      .map(([request]) => request)
      .filter(({ query }) => query.includes('BY value ='));
    expect(breakdownRequests).toHaveLength(3);
    breakdownRequests.forEach(({ query }) =>
      expect(query).not.toContain('`attributes.exception.type` IN')
    );
  });

  it('fingerprints only the crashes of the type the app knows for the latest crash', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([]));

    await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      crashType: 'SIGTRAP',
      start: START,
      end: END,
    });

    const [[latestRequest]] = client.esql.query.mock.calls;
    expect(latestRequest.query).toContain(
      'WHERE `attributes.elastic.error.grouping_key` IS NOT NULL OR (`attributes.exception.type` IN ("SIGTRAP"))'
    );
  });

  it('fingerprints only the crashes without a type for a group without one', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([]));

    await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      crashType: null,
      start: START,
      end: END,
    });

    const [[latestRequest]] = client.esql.query.mock.calls;
    expect(latestRequest.query).toContain(
      '`attributes.exception.type` IS NULL OR `attributes.exception.type` == ""'
    );
  });

  it("looks for the latest crash of every type when none has the app's type", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(
        query.includes('LIMIT 1 |') && !query.includes('`attributes.exception.type` IN')
          ? [{ ...LATEST, session_id: null }]
          : []
      )
    );

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      crashType: 'SIGTRAP',
      start: START,
      end: END,
    });

    // The list's type was a stored-fingerprint crash's; the group's latest crash has another.
    expect(detail.latestCrash).not.toBeNull();
    const [[typedRequest], [allTypesRequest]] = client.esql.query.mock.calls;
    expect(typedRequest.query).toContain('`attributes.exception.type` IN ("SIGTRAP")');
    expect(allTypesRequest.query).toContain('LIMIT 1 |');
    expect(allTypesRequest.query).not.toContain('`attributes.exception.type` IN');
  });

  it("looks for the latest crash of every type when the app's type only found a stored-fingerprint crash", async () => {
    const { client, esClient } = createTracedEsClientMock();
    const newerComputed = { ...LATEST, happened_at: '2021-01-18T12:50:00.000Z', session_id: null };
    client.esql.query.mockImplementation(async ({ query }) => {
      if (!query.includes('LIMIT 1 |')) {
        return esqlResponse([]);
      }
      // The typed query keeps stored-fingerprint crashes of any type, so it can miss a newer
      // computed crash of another type.
      return esqlResponse(
        query.includes('`attributes.exception.type` IN')
          ? [{ ...LATEST, session_id: null, stored_fingerprint: FINGERPRINT }]
          : [newerComputed]
      );
    });

    const detail = await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      crashType: 'SIGTRAP',
      start: START,
      end: END,
    });

    expect(detail.latestCrash?.time).toBe(newerComputed.happened_at);
    const latestRequests = client.esql.query.mock.calls
      .map(([request]) => request)
      .filter(({ query }) => query.includes('LIMIT 1 |'));
    expect(latestRequests).toHaveLength(2);
  });

  it("trusts the app's type when it finds a computed crash, whose fingerprint hashes the type", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockImplementation(async ({ query }) =>
      esqlResponse(query.includes('LIMIT 1 |') ? [{ ...LATEST, session_id: null }] : [])
    );

    await getCrashGroup({
      esClient,
      filters: { serviceName: 'ride-ios' },
      fingerprint: FINGERPRINT,
      crashType: 'SIGTRAP',
      start: START,
      end: END,
    });

    const latestRequests = client.esql.query.mock.calls
      .map(([request]) => request)
      .filter(({ query }) => query.includes('LIMIT 1 |'));
    expect(latestRequests).toHaveLength(1);
    expect(latestRequests[0].query).toContain('`attributes.exception.type` IN ("SIGTRAP")');
  });

  it.each([
    ['the type the app knows', 'SIGTRAP'],
    ['no type from the app', undefined],
  ])(
    'matches the stored fingerprint, computing none, for a key no crash can compute, with %s',
    async (_, crashType) => {
      const { client, esClient } = createTracedEsClientMock();
      client.esql.query.mockImplementation(async ({ query }) =>
        esqlResponse(
          query.includes('LIMIT 1 |')
            ? [{ ...LATEST, session_id: null, stored_fingerprint: 'ingest-fingerprint' }]
            : []
        )
      );

      await getCrashGroup({
        esClient,
        filters: { serviceName: 'ride-ios' },
        fingerprint: 'ingest-fingerprint',
        crashType,
        start: START,
        end: END,
      });

      const requests = client.esql.query.mock.calls.map(([request]) => request);
      expect(requests.filter(({ query }) => query.includes('LIMIT 1 |'))).toHaveLength(1);
      // The latest crash and the three breakdowns.
      expect(requests).toHaveLength(4);
      requests.forEach(({ query, params }) => {
        expect(query).toContain('| WHERE `attributes.elastic.error.grouping_key` == ?fingerprint');
        expect(query).not.toContain('SHA256');
        expect(params).toEqual(expect.arrayContaining([{ fingerprint: 'ingest-fingerprint' }]));
      });
    }
  );
});
