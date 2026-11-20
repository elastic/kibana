/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MOBILE_FIELDS } from '../../../../common/mobile_panel';
import { getMobileApplications } from './get_mobile_applications';
import { applicationsQuery, isMobileSdkName, releasesQuery } from './queries';
import { toApplication } from './to_application';

const ALL_MAPPED = new Set<string>(Object.values(MOBILE_FIELDS));
const without = (...fields: string[]) =>
  new Set([...ALL_MAPPED].filter((field) => !fields.includes(field)));

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
});

describe('applicationsQuery', () => {
  it('queries by telemetry.sdk.name and never by the SDK language', () => {
    const query = applicationsQuery(ALL_MAPPED);

    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(query).not.toContain('telemetry.sdk.language');
  });

  it('takes the platforms from the SDK name, so iPads, which report `os.name: iPadOS`, count as iOS', () => {
    const query = applicationsQuery(ALL_MAPPED);

    expect(query).toContain('platforms = VALUES(resource.attributes.telemetry.sdk.name)');
    expect(query).not.toContain('os.name');
  });

  it('leaves out a metric whose field no index maps, e.g. exceptions where no app threw', () => {
    const query = applicationsQuery(without(MOBILE_FIELDS.exceptionType));

    expect(query).not.toContain('exception.type');
    expect(query).toContain('EVAL exceptions = 0');
  });
});

describe('releasesQuery', () => {
  it('keeps the most used versions first, so the cut drops the least used', () => {
    expect(releasesQuery(ALL_MAPPED)).toContain('| SORT sessions DESC\n| LIMIT');
  });

  it('is not run when no index maps service.version', () => {
    expect(releasesQuery(without(MOBILE_FIELDS.serviceVersion))).toBeUndefined();
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
  const esql = (columns: string[], values: unknown[][]) => ({
    columns: columns.map((name) => ({ name, type: 'keyword' })),
    values,
  });

  const clientMapping = (mapped: Set<string>, query: jest.Mock) =>
    ({
      fieldCaps: jest
        .fn()
        .mockResolvedValue({ fields: Object.fromEntries([...mapped].map((field) => [field, {}])) }),
      esql: { query },
    } as unknown as ElasticsearchClient);

  const range = {
    start: Date.parse('2021-01-18T00:00:00.000Z'),
    end: Date.parse('2021-01-19T00:00:00.000Z'),
  };

  it('has no applications, without querying, when no readable index has mobile data', async () => {
    const query = jest.fn();

    const result = await getMobileApplications({
      esClient: clientMapping(new Set([MOBILE_FIELDS.serviceName]), query),
      ...range,
    });

    expect(result).toEqual({ applications: [], environments: [] });
    expect(query).not.toHaveBeenCalled();
  });

  it('fails on a query error, so the source is reported unavailable', async () => {
    const query = jest.fn().mockRejectedValue(new Error('security_exception'));

    await expect(
      getMobileApplications({ esClient: clientMapping(ALL_MAPPED, query), ...range })
    ).rejects.toThrow('security_exception');
  });

  it('still lists the applications when no index maps exception.type', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(
        esql(
          ['docs', 'sessions', 'users', 'platforms', 'last_seen', 'service.name', 'exceptions'],
          [[9, 3, 2, 'android', '2021-01-18T12:00:00.000Z', 'trailmap-android', 0]]
        )
      )
      .mockResolvedValueOnce(esql(['docs', 'sessions', 'service.name', 'service.version'], []))
      .mockResolvedValueOnce(esql(['docs'], [[9]]));

    const result = await getMobileApplications({
      esClient: clientMapping(without(MOBILE_FIELDS.exceptionType), query),
      ...range,
    });

    expect(query.mock.calls[0][0].query).not.toContain('exception.type');
    expect(result.applications).toEqual([
      expect.objectContaining({ serviceName: 'trailmap-android', errorRate: 0 }),
    ]);
  });

  it('merges the application, release and environment queries', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce(
        esql(
          ['docs', 'sessions', 'users', 'exceptions', 'platforms', 'last_seen', 'service.name'],
          [[9, 3, 2, 1, 'android', '2021-01-18T12:00:00.000Z', 'trailmap-android']]
        )
      )
      .mockResolvedValueOnce(
        esql(
          ['docs', 'sessions', 'service.name', 'service.version'],
          [
            [4, 2, 'trailmap-android', '1.0.0 (2)'],
            [2, 1, 'trailmap-android', '1.0.0 (1)'],
          ]
        )
      )
      .mockResolvedValueOnce(
        esql(
          ['docs', 'service.environment', 'resource.attributes.deployment.environment.name'],
          [
            [5, 'production', null],
            [4, null, null],
          ]
        )
      );

    const result = await getMobileApplications({
      esClient: clientMapping(ALL_MAPPED, query),
      ...range,
    });

    expect(result.environments).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
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
