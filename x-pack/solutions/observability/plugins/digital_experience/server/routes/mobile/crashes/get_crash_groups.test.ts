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
import { getCrashGroups, getCrashReleases } from './get_crash_groups';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.parse('2021-01-18T12:00:00.000Z');
const END = Date.parse('2021-01-18T13:00:00.000Z');

const groupRow = (fingerprint: string, overrides: Record<string, unknown> = {}) => ({
  fingerprint,
  users: 3,
  events: 3,
  sessions: 3,
  first_seen: '2021-01-18T12:05:00.000Z',
  last_seen: '2021-01-18T12:55:00.000Z',
  exception_type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  first_release: '4.2.0',
  last_release: '4.2.0',
  ...overrides,
});

const historyRow = (fingerprint: string, overrides: Record<string, unknown> = {}) => ({
  fingerprint,
  releases: '4.2.0',
  first_seen: '2021-01-18T12:05:00.000Z',
  first_release: '4.2.0',
  ...overrides,
});

describe('getCrashGroups', () => {
  it('has no groups, and runs no other query, without crashes', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([]));

    const groups = await getCrashGroups({
      esClient,
      filters: { serviceName: 'trailmap-android' },
      start: START,
      end: END,
    });

    expect(groups).toEqual([]);
    expect(client.esql.query).toHaveBeenCalledTimes(1);
  });

  it('marks new the groups only the newest release crashed on, in their order', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(
        esqlResponse([
          groupRow('npe'),
          groupRow('oom', {
            users: 2,
            events: 10,
            exception_type: 'java.lang.OutOfMemoryError',
            first_release: '4.1.0',
          }),
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([
          {
            fingerprint: 'npe',
            releases: '4.2.0',
            first_seen: '2021-01-18T12:05:00.000Z',
            first_release: '4.2.0',
          },
          {
            fingerprint: 'oom',
            releases: ['4.1.0', '4.2.0'],
            first_seen: '2021-01-02T09:00:00.000Z',
            first_release: '4.1.0',
          },
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([{ 'service.name': 'trailmap-android', latest_release: '4.2.0' }])
      );

    const groups = await getCrashGroups({
      esClient,
      filters: { serviceName: 'trailmap-android', release: '4.2.0' },
      start: START,
      end: END,
      environment: 'production',
    });

    expect(groups).toEqual([
      {
        fingerprint: 'npe',
        type: 'java.lang.NullPointerException',
        message: 'TrackRecorder is null',
        users: 3,
        events: 3,
        sessions: 3,
        firstSeen: { time: '2021-01-18T12:05:00.000Z', release: '4.2.0' },
        lastSeen: { time: '2021-01-18T12:55:00.000Z', release: '4.2.0' },
        newInRelease: '4.2.0',
      },
      expect.objectContaining({
        fingerprint: 'oom',
        users: 2,
        events: 10,
        // Its first crash in the lookback, before the range.
        firstSeen: { time: '2021-01-02T09:00:00.000Z', release: '4.1.0' },
        newInRelease: null,
      }),
    ]);

    const [[groupsRequest], [historyRequest], [latestRequest]] = client.esql.query.mock.calls;
    // Crashes sent on the next launch are in the timestamp filter, a day past the range.
    expect(groupsRequest.filter).toEqual({
      bool: {
        filter: [
          { range: { '@timestamp': { gte: START, lt: END + DAY, format: 'epoch_millis' } } },
          expect.anything(),
        ],
      },
    });
    expect(groupsRequest.params).toEqual(expect.arrayContaining([{ release: '4.2.0' }]));
    // The first crash and the new check look 30 days back on every release, whatever the filter.
    expect(historyRequest.query).toContain('WHERE fingerprint IN ("npe", "oom")');
    expect(historyRequest.params).not.toEqual(expect.arrayContaining([{ release: '4.2.0' }]));
    expect(historyRequest.params).toEqual(
      expect.arrayContaining([{ crash_start: new Date(END - 30 * DAY).toISOString() }])
    );
    expect(latestRequest.params).toEqual([{ service_name: 'trailmap-android' }]);
  });

  it('marks nothing new without a newest release', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([groupRow('npe', { first_release: null })]))
      .mockResolvedValueOnce(
        esqlResponse([
          {
            fingerprint: 'npe',
            releases: null,
            first_seen: '2021-01-18T12:05:00.000Z',
            first_release: null,
          },
        ])
      )
      .mockResolvedValueOnce(esqlResponse([]));

    const [group] = await getCrashGroups({
      esClient,
      filters: { serviceName: 'trailmap-android' },
      start: START,
      end: END,
    });

    expect(group.newInRelease).toBeNull();
    expect(group.firstSeen.release).toBeNull();
  });

  it('looks for older releases over the whole range when it is longer than the lookback', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([groupRow('npe')]))
      .mockResolvedValueOnce(esqlResponse([historyRow('npe')]))
      .mockResolvedValueOnce(esqlResponse([{ latest_release: '4.2.0' }]));
    const start = END - 90 * DAY;

    await getCrashGroups({
      esClient,
      filters: { serviceName: 'trailmap-android' },
      start,
      end: END,
    });

    const [, [historyRequest]] = client.esql.query.mock.calls;
    expect(historyRequest.params).toEqual(
      expect.arrayContaining([{ crash_start: new Date(start).toISOString() }])
    );
  });

  it('never marks new a group of EDOT iOS reports, whose fingerprint changes with every build', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(
        esqlResponse([
          groupRow('sigsegv', { exception_type: 'SIGSEGV', ios_reports: 2 }),
          groupRow('npe'),
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([
          historyRow('sigsegv', { first_seen: '2021-01-10T08:00:00.000Z' }),
          historyRow('npe'),
        ])
      )
      .mockResolvedValueOnce(esqlResponse([{ latest_release: '4.2.0' }]));

    const groups = await getCrashGroups({
      esClient,
      filters: { serviceName: 'transit-companion' },
      start: START,
      end: END,
    });

    // Both only on the newest release, but the iOS one's fingerprint can't tell an older build's.
    // Its first crash still comes from the lookback.
    expect(
      groups.map(({ fingerprint, firstSeen, newInRelease }) => ({
        fingerprint,
        firstSeen: firstSeen.time,
        newInRelease,
      }))
    ).toEqual([
      { fingerprint: 'sigsegv', firstSeen: '2021-01-10T08:00:00.000Z', newInRelease: null },
      { fingerprint: 'npe', firstSeen: '2021-01-18T12:05:00.000Z', newInRelease: '4.2.0' },
    ]);
    const [, [historyRequest]] = client.esql.query.mock.calls;
    expect(historyRequest.query).toContain('WHERE fingerprint IN ("sigsegv", "npe")');
  });

  it("keeps the range's first crash of a group the lookback misses", async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([groupRow('npe')]))
      .mockResolvedValueOnce(esqlResponse([]))
      .mockResolvedValueOnce(esqlResponse([{ latest_release: '4.2.0' }]));

    const [group] = await getCrashGroups({
      esClient,
      filters: { serviceName: 'trailmap-android' },
      start: START,
      end: END,
    });

    expect(group.firstSeen).toEqual({ time: '2021-01-18T12:05:00.000Z', release: '4.2.0' });
    expect(group.newInRelease).toBeNull();
  });
});

describe('getCrashReleases', () => {
  it('counts the crashes per release that crashed, whatever the release filter', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(
      esqlResponse([
        { release: '8.5.0', events: 2 },
        { release: '8.4.0', events: 1 },
        { release: null, events: 4 },
      ])
    );

    const releases = await getCrashReleases({
      esClient,
      filters: { serviceName: 'ride-ios', osName: 'iOS', release: '8.4.0' },
      start: START,
      end: END,
    });

    expect(releases).toEqual([
      { key: '8.5.0', count: 2 },
      { key: '8.4.0', count: 1 },
    ]);
    const [[request]] = client.esql.query.mock.calls;
    expect(request.query).toContain('STATS events = COUNT(*) BY release = crash_release');
    expect(request.query).not.toContain('crash_release == ?release');
    expect(request.params).toEqual(expect.arrayContaining([{ os_name: 'iOS' }]));
    // Crashes sent on the next launch are in the timestamp filter, a day past the range.
    expect(request.filter.bool.filter[0]).toEqual({
      range: { '@timestamp': { gte: START, lt: END + DAY, format: 'epoch_millis' } },
    });
  });
});
