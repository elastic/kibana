/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { getMobileApplications } from './get_mobile_applications';
import { applicationsQuery, latestReleasesQuery } from './queries';
import { toApplication } from './to_application';
import type { MobileApplicationRow } from './to_application';

describe('applicationsQuery', () => {
  const { query } = applicationsQuery().toRequest();

  it('reads unmapped fields as null, so a field no app sent counts 0 instead of failing', () => {
    expect(query).toMatch(/^SET unmapped_fields = "nullify";/);
    expect(query).toContain('exceptions = COUNT(`attributes.exception.type`)');
  });

  it('has a row per application, with the platforms it reported on', () => {
    expect(query).toContain('platforms = VALUES(platform)');
    expect(query).toMatch(/BY `service.name` \| SORT/);
  });

  it('leaves out documents without a service name, which name no application', () => {
    expect(query).toContain('WHERE `service.name` IS NOT NULL');
  });
});

describe('latestReleasesQuery', () => {
  it('picks one release per listed application, any platform, the names escaped', () => {
    const { query } = latestReleasesQuery(['shop-mobile', 'a"b']).toRequest();

    expect(query).toContain('| WHERE `service.name` IN ("shop-mobile", "a\\"b")');
    expect(query).toMatch(/\| STATS latest_release = [^|]+ BY `service.name`/);
  });

  it('picks the newest release compared as versions, whatever its sessions', () => {
    const { query } = latestReleasesQuery(['shop-mobile']).toRequest();

    expect(query).toContain('latest_release = MAX(TO_VERSION(`service.version`))');
    expect(query).not.toContain('COUNT_DISTINCT');
  });
});

describe('toApplication', () => {
  const row: MobileApplicationRow = {
    'service.name': 'shop-mobile',
    sessions: 10,
    users: 4,
    exceptions: 5,
    platforms: ['ios', 'android'],
    last_seen: '2021-01-18T12:00:00.000Z',
  };

  it('maps the row metrics', () => {
    expect(toApplication(row, { environments: [], latest: '2.0.0' })).toEqual({
      serviceName: 'shop-mobile',
      source: 'otel',
      applicationType: 'mobile',
      platforms: ['android', 'ios'],
      environments: [],
      latestRelease: '2.0.0',
      sessions: { count: 10 },
      users: { count: 4 },
      crashFreeSessions: { value: null, previous: null, delta: null },
      errorRate: 0.5,
      lastSeen: '2021-01-18T12:00:00.000Z',
    });
  });

  it('reads a single platform, which VALUES returns as a value, not a list', () => {
    expect(
      toApplication({ ...row, platforms: 'android' }, { environments: [], latest: null }).platforms
    ).toEqual(['android']);
    expect(
      toApplication({ ...row, platforms: null }, { environments: [], latest: null }).platforms
    ).toEqual([]);
  });

  it('has no error rate without sessions, and not enough data for crash-free sessions', () => {
    const application = toApplication(
      { ...row, sessions: 0, exceptions: 0 },
      { environments: [], latest: null }
    );

    expect(application.errorRate).toBeNull();
    expect(application.crashFreeSessions.value).toBeNull();
  });
});

describe('getMobileApplications', () => {
  const clientWith = (esqlCall: jest.Mock) =>
    ({ esql: esqlCall } as unknown as TracedElasticsearchClient);

  const range = {
    start: Date.parse('2021-01-18T00:00:00.000Z'),
    end: Date.parse('2021-01-19T00:00:00.000Z'),
  };

  it('has no applications, without a release query, when there is no mobile data', async () => {
    const esqlCall = jest.fn().mockResolvedValue({ hits: [] });

    const result = await getMobileApplications({ esClient: clientWith(esqlCall), ...range });

    expect(result).toEqual({ applications: [], environments: [] });
    expect(esqlCall).toHaveBeenCalledTimes(2);
  });

  it('fails on a query error, so the source is reported unavailable', async () => {
    const esqlCall = jest.fn().mockRejectedValue(new Error('security_exception'));

    await expect(
      getMobileApplications({ esClient: clientWith(esqlCall), ...range })
    ).rejects.toThrow('security_exception');
  });

  it('merges the application, environment and latest release queries', async () => {
    const esqlCall = jest
      .fn()
      .mockResolvedValueOnce({
        hits: [
          {
            'service.name': 'trailmap-android',
            sessions: 3,
            users: 2,
            exceptions: 1,
            platforms: 'android',
            last_seen: '2021-01-18T12:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        hits: [
          { docs: 5, 'service.environment': 'production' },
          { docs: 4, 'service.environment': null },
        ],
      })
      .mockResolvedValueOnce({
        hits: [{ 'service.name': 'trailmap-android', latest_release: '1.0.0' }],
      });

    const result = await getMobileApplications({ esClient: clientWith(esqlCall), ...range });

    expect(result.environments).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
    expect(result.applications).toEqual([
      expect.objectContaining({
        serviceName: 'trailmap-android',
        latestRelease: '1.0.0',
        platforms: ['android'],
        errorRate: 1 / 3,
      }),
    ]);
    // The latest release is of the listed applications, over the last 24 hours of the range.
    const [operationName, request] = esqlCall.mock.calls[2];
    expect(operationName).toBe('get_mobile_latest_releases');
    expect(request.query).toContain('`service.name` IN ("trailmap-android")');
    expect(request.filter.bool.filter[0]).toEqual({
      range: {
        '@timestamp': {
          gte: range.end - 24 * 60 * 60 * 1000,
          lt: range.end,
          format: 'epoch_millis',
        },
      },
    });
  });
});
