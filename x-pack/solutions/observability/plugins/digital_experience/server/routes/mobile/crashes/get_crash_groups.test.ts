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
import { getCrashGroups } from './get_crash_groups';

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
          { fingerprint: 'npe', releases: '4.2.0' },
          { fingerprint: 'oom', releases: ['4.1.0', '4.2.0'] },
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
      expect.objectContaining({ fingerprint: 'oom', users: 2, events: 10, newInRelease: null }),
    ]);

    const [[groupsRequest], [releasesRequest], [latestRequest]] = client.esql.query.mock.calls;
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
    // The new check looks 30 days back on every release, whatever the release filter.
    expect(releasesRequest.query).toContain('WHERE fingerprint IN ("npe", "oom")');
    expect(releasesRequest.params).not.toEqual(expect.arrayContaining([{ release: '4.2.0' }]));
    expect(releasesRequest.params).toEqual(
      expect.arrayContaining([{ crash_start: new Date(END - 30 * DAY).toISOString() }])
    );
    expect(latestRequest.params).toEqual([{ service_name: 'trailmap-android' }]);
  });

  it('marks nothing new without a newest release', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(esqlResponse([groupRow('npe', { first_release: null })]))
      .mockResolvedValueOnce(esqlResponse([{ fingerprint: 'npe', releases: null }]))
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
});
