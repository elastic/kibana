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

  it('has a row per application, with the platforms and environments it reported on', () => {
    expect(query).toContain('platforms = VALUES(platform)');
    expect(query).toContain('environments = VALUES(`service.environment`)');
    expect(query).toContain(
      'environment_names = VALUES(`resource.attributes.deployment.environment.name`)'
    );
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
    expect(query).toMatch(/\| STATS numeric_release = [^|]+ BY `service.name`/);
  });

  it('narrows to the listed applications before picking their releases', () => {
    const { query } = latestReleasesQuery(['shop-mobile']).toRequest();

    expect(query).toMatch(
      /WHERE `service\.name` IN \("shop-mobile"\) \| WHERE `service\.version` IS NOT NULL/
    );
    expect(query).toMatch(/\| KEEP `service\.name`, latest_release \| LIMIT 1000$/);
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
    expect(toApplication(row, '2.0.0')).toEqual({
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

  it('has no latest release longer than the KPI route accepts, so its link never fails', () => {
    expect(toApplication(row, 'x'.repeat(1025)).latestRelease).toBeNull();
  });

  it('reads a single platform, which VALUES returns as a value, not a list', () => {
    expect(toApplication({ ...row, platforms: 'android' }, null).platforms).toEqual(['android']);
    expect(toApplication({ ...row, platforms: null }, null).platforms).toEqual([]);
  });

  it('has no error rate without sessions, and not enough data for crash-free sessions', () => {
    const application = toApplication({ ...row, sessions: 0, exceptions: 0 }, null);

    expect(application.errorRate).toBeNull();
    expect(application.crashFreeSessions.value).toBeNull();
  });

  it('lists the environments of both fields, once each, up to 10', () => {
    expect(
      toApplication(
        { ...row, environments: ['production', 'staging'], environment_names: 'production' },
        null
      ).environments
    ).toEqual(['production', 'staging']);
    expect(
      toApplication(
        { ...row, environments: Array.from({ length: 12 }, (_, index) => `env-${index}`) },
        null
      ).environments
    ).toHaveLength(10);
  });
});

describe('getMobileApplications', () => {
  const range = {
    start: Date.parse('2021-01-18T00:00:00.000Z'),
    end: Date.parse('2021-01-19T00:00:00.000Z'),
  };

  it('has no applications, without a release query, when there is no mobile data', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockResolvedValue(esqlResponse([]));

    const result = await getMobileApplications({ esClient, ...range });

    expect(result).toEqual({ applications: [], environments: [] });
    expect(client.esql.query).toHaveBeenCalledTimes(2);
  });

  it('fails on a query error, so the source is reported unavailable', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query.mockRejectedValue(new Error('security_exception'));

    await expect(getMobileApplications({ esClient, ...range })).rejects.toThrow(
      'security_exception'
    );
  });

  it('merges the application, environment and latest release queries', async () => {
    const { client, esClient } = createTracedEsClientMock();
    client.esql.query
      .mockResolvedValueOnce(
        esqlResponse([
          {
            'service.name': 'trailmap-android',
            sessions: 3,
            users: 2,
            exceptions: 1,
            platforms: 'android',
            last_seen: '2021-01-18T12:00:00.000Z',
          },
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([
          { docs: 5, 'service.environment': 'production' },
          { docs: 4, 'service.environment': null },
        ])
      )
      .mockResolvedValueOnce(
        esqlResponse([{ 'service.name': 'trailmap-android', latest_release: '1.0.0' }])
      );

    const result = await getMobileApplications({ esClient, ...range });

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
    const [[request]] = client.esql.query.mock.calls.slice(2);
    expect(request.query).toContain('`service.name` IN ("trailmap-android")');
    expect(request.filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: range.end - 24 * 60 * 60 * 1000,
                lt: range.end,
                format: 'epoch_millis',
              },
            },
          },
          expect.anything(),
        ],
      },
    });
  });
});
