/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getMobileApplications } from './get_mobile_applications';
import { normalizeVersion } from './normalize_version';
import { applicationsQuery, isMobileSdkName } from './queries';
import { latestRelease, toApplication, toPlatforms } from './to_application';

describe('isMobileSdkName', () => {
  it.each(['android', 'iOS'])('detects the %s SDK, which React Native apps run on', (name) => {
    expect(isMobileSdkName(name)).toBe(true);
  });

  it.each(['webjs', 'java', 'swift', 'nodejs', '', undefined, null])(
    'does not detect %p, so backend Java and Swift services are not mobile',
    (name) => {
      expect(isMobileSdkName(name)).toBe(false);
    }
  );

  it('queries by telemetry.sdk.name and never by the SDK language', () => {
    const query = applicationsQuery();

    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(query).not.toContain('telemetry.sdk.language');
  });
});

describe('normalizeVersion', () => {
  it.each([
    ['1.2.3', '1.2.3'],
    ['1.2.3 (45)', '1.2.3'],
    ['1.2.3+45', '1.2.3'],
    ['1.2.3-beta.1 (7)', '1.2.3-beta.1'],
    [' 2.0 ', '2.0'],
  ])('turns %p into %p, so one release has one name', (raw, expected) => {
    expect(normalizeVersion(raw)).toBe(expected);
  });
});

describe('latestRelease', () => {
  it('is the normalized version with the most sessions, builds adding up', () => {
    expect(
      latestRelease([
        { version: '1.0.0 (10)', sessions: 4 },
        { version: '1.0.0 (11)', sessions: 4 },
        { version: '1.1.0', sessions: 5 },
      ])
    ).toBe('1.0.0');
  });

  it('breaks a tie with the higher version', () => {
    expect(
      latestRelease([
        { version: '1.9.0', sessions: 2 },
        { version: '1.10.0', sessions: 2 },
      ])
    ).toBe('1.10.0');
  });

  it('is null without a version', () => {
    expect(latestRelease([])).toBeNull();
    expect(latestRelease([{ version: null, sessions: 3 }])).toBeNull();
  });
});

describe('toPlatforms', () => {
  it('sorts the platforms of one or many SDK names and leaves out others', () => {
    expect(toPlatforms(['iOS', 'android', 'java'])).toEqual(['android', 'ios']);
    expect(toPlatforms('iOS')).toEqual(['ios']);
    expect(toPlatforms(null)).toEqual([]);
  });

  it('is queried by SDK name, so iPads, which report `os.name: iPadOS`, count as iOS', () => {
    expect(applicationsQuery()).toContain(
      'platforms = VALUES(resource.attributes.telemetry.sdk.name)'
    );
    expect(applicationsQuery()).not.toContain('os.name');
  });
});

describe('toApplication', () => {
  const row = {
    'service.name': 'shop-mobile',
    sessions: 10,
    users: 4,
    exceptions: 5,
    platforms: ['android', 'iOS'],
    last_seen: '2021-01-18T12:00:00.000Z',
  };

  it('maps the row metrics', () => {
    expect(toApplication(row, { environments: [], latest: '2.0.0' })).toEqual({
      serviceName: 'shop-mobile',
      source: 'mobile',
      environments: [],
      platforms: ['android', 'ios'],
      latestRelease: '2.0.0',
      sessions: { count: 10 },
      users: { count: 4 },
      crashFreeSessions: { value: null, previous: null, delta: null },
      errorRate: 0.5,
      lastSeen: '2021-01-18T12:00:00.000Z',
    });
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
  const missingDataError = (reason: string) =>
    Object.assign(new Error('verification_exception'), {
      meta: { body: { error: { type: 'verification_exception', reason } } },
    });

  it('has no applications when no readable index has mobile data, instead of failing', async () => {
    const query = jest
      .fn()
      .mockRejectedValue(
        missingDataError('Found 1 problem\nline 2:9: Unknown column [resource.attributes.telemetry.sdk.name]')
      );
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    const result = await getMobileApplications({ esClient, start: 0, end: 3_600_000 });

    expect(result.applications).toEqual([]);
    expect(result.environments).toEqual([]);
  });

  it('fails on any other error, so the source is reported unavailable', async () => {
    const query = jest.fn().mockRejectedValue(new Error('security_exception'));
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    await expect(getMobileApplications({ esClient, start: 0, end: 3_600_000 })).rejects.toThrow(
      'security_exception'
    );
  });

  const esql = (columns: string[], values: unknown[][]) => ({
    columns: columns.map((name) => ({ name, type: 'keyword' })),
    values,
  });

  it('merges the application, release and environment queries', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(
        esql(
          ['sessions', 'users', 'exceptions', 'platforms', 'last_seen', 'service.name'],
          [[3, 2, 1, 'android', '2021-01-18T12:00:00.000Z', 'trailmap-android']]
        )
      )
      .mockResolvedValueOnce(
        esql(
          ['sessions', 'service.name', 'service.version'],
          [
            [1, 'trailmap-android', '1.0.0 (1)'],
            [2, 'trailmap-android', '1.0.0 (2)'],
          ]
        )
      )
      .mockResolvedValueOnce(esql(['docs', 'service.environment'], [[5, 'production']]));
    const esClient = { esql: { query } } as unknown as ElasticsearchClient;

    const result = await getMobileApplications({
      esClient,
      start: Date.parse('2021-01-18T00:00:00.000Z'),
      end: Date.parse('2021-01-19T00:00:00.000Z'),
    });

    expect(result.environments).toEqual(['production']);
    expect(result.applications).toEqual([
      expect.objectContaining({
        serviceName: 'trailmap-android',
        latestRelease: '1.0.0',
        platforms: ['android'],
        errorRate: 1 / 3,
      }),
    ]);
  });
});
