/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTIONS_METRIC,
  MOBILE_FIELDS,
  PLATFORM_BY_SDK_NAME,
  SESSIONS_METRIC,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobileEnvironmentCondition,
  mobilePanelDiscoverEsql,
  mobilePanelEsql,
  mobileStats,
  toComparedValue,
} from './mobile_panel';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ALL_MAPPED = new Set<string>(Object.values(MOBILE_FIELDS));
const without = (...fields: string[]) =>
  new Set([...ALL_MAPPED].filter((field) => !fields.includes(field)));

describe('getMobileTimeBucket', () => {
  it('is hourly up to 24 hours and daily from there', () => {
    expect(getMobileTimeBucket(0, HOUR)).toBe('hour');
    expect(getMobileTimeBucket(0, DAY)).toBe('hour');
    expect(getMobileTimeBucket(0, 7 * DAY)).toBe('day');
    expect(getMobileTimeBucket(0, 30 * DAY)).toBe('day');
  });
});

describe('getPreviousPeriod', () => {
  it('is the period of equal length that ends where the range starts', () => {
    expect(getPreviousPeriod(10 * DAY, 17 * DAY)).toEqual({ start: 3 * DAY, end: 10 * DAY });
  });
});

describe('toComparedValue', () => {
  it('has a delta only when both values are known', () => {
    expect(toComparedValue(5, 3)).toEqual({ value: 5, previous: 3, delta: 2 });
    expect(toComparedValue(null, 3)).toEqual({ value: null, previous: 3, delta: null });
  });
});

describe('PLATFORM_BY_SDK_NAME', () => {
  it('is the platform of each lower-cased SDK name', () => {
    expect(PLATFORM_BY_SDK_NAME).toEqual({ android: 'android', ios: 'ios' });
  });
});

describe('mobilePanelEsql', () => {
  it('applies the SDK detection and the service, not the SDK language', () => {
    const query = mobilePanelEsql({ serviceName: 'shop-mobile' }, ALL_MAPPED);

    expect(query).toContain('FROM traces-*.otel-*,logs-*.otel-*');
    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(query).toContain('service.name == "shop-mobile"');
    expect(query).not.toContain('sdk.language');
  });

  it('escapes the values, newlines included, so a value cannot end its string', () => {
    const query = mobilePanelEsql({ serviceName: 'a"b\\c\nd' }, ALL_MAPPED);

    expect(query).toContain('service.name == "a\\"b\\\\c\\nd"');
  });

  it('applies the platform and the release, matching the release with or without a build', () => {
    const query = mobilePanelEsql(
      { serviceName: 'shop', platform: 'ios', release: '1.2.3' },
      ALL_MAPPED
    );

    expect(query).toContain('resource.attributes.telemetry.sdk.name == "iOS"');
    expect(query).not.toContain('os.name');
    expect(query).toContain('service.version == "1.2.3"');
    expect(query).toContain('STARTS_WITH(service.version, "1.2.3 (")');
    expect(query).toContain('STARTS_WITH(service.version, "1.2.3+")');
  });

  it('matches no release when no index maps service.version', () => {
    const query = mobilePanelEsql(
      { serviceName: 'shop', release: '1.2.3' },
      without(MOBILE_FIELDS.serviceVersion)
    );

    expect(query).toContain('AND false');
    expect(query).not.toContain('service.version');
  });
});

describe('mobileStats', () => {
  it('counts every metric whose field some index maps', () => {
    expect(
      mobileStats([SESSIONS_METRIC, EXCEPTIONS_METRIC], ALL_MAPPED, { by: 'service.name' })
    ).toEqual([
      'STATS docs = COUNT(*), sessions = COUNT_DISTINCT(attributes.session.id), exceptions = COUNT(attributes.exception.type) BY service.name',
    ]);
  });

  it('sets a metric whose field no index maps to its fallback instead of reading it', () => {
    const commands = mobileStats(
      [SESSIONS_METRIC, EXCEPTIONS_METRIC],
      without(MOBILE_FIELDS.exceptionType)
    );

    expect(commands).toEqual([
      'STATS docs = COUNT(*), sessions = COUNT_DISTINCT(attributes.session.id)',
      'EVAL exceptions = 0',
    ]);
  });
});

describe('mobileEnvironmentCondition', () => {
  it('filters nothing for all environments', () => {
    expect(mobileEnvironmentCondition(undefined, ALL_MAPPED)).toBeUndefined();
    expect(mobileEnvironmentCondition('ENVIRONMENT_ALL', ALL_MAPPED)).toBeUndefined();
  });

  it('matches either environment field', () => {
    expect(mobileEnvironmentCondition('production', ALL_MAPPED)).toBe(
      '(service.environment == "production" OR resource.attributes.deployment.environment.name == "production")'
    );
  });

  it('reads only the environment fields some index maps', () => {
    expect(mobileEnvironmentCondition('production', without(MOBILE_FIELDS.environmentName))).toBe(
      '(service.environment == "production")'
    );
    expect(
      mobileEnvironmentCondition(
        'production',
        without(MOBILE_FIELDS.environment, MOBILE_FIELDS.environmentName)
      )
    ).toBe('false');
  });

  it(`matches APM's sentinel or no environment for "Not defined"`, () => {
    expect(mobileEnvironmentCondition('ENVIRONMENT_NOT_DEFINED', ALL_MAPPED)).toBe(
      '(service.environment == "ENVIRONMENT_NOT_DEFINED" OR (service.environment IS NULL AND resource.attributes.deployment.environment.name IS NULL))'
    );
  });
});

describe('mobilePanelDiscoverEsql', () => {
  it('carries the filters and the environment over to Discover', () => {
    const query = mobilePanelDiscoverEsql(
      { serviceName: 'shop', platform: 'android' },
      ALL_MAPPED,
      { bucket: 'day', environment: 'production' }
    );

    expect(query).toContain('telemetry.sdk.name == "android"');
    expect(query).toContain('| WHERE (service.environment == "production"');
    expect(query).toContain('BUCKET(@timestamp, 1 day)');
  });

  it('only reads mapped fields, so Discover can run it', () => {
    const query = mobilePanelDiscoverEsql(
      { serviceName: 'shop' },
      without(MOBILE_FIELDS.exceptionType, MOBILE_FIELDS.installationId),
      { bucket: 'hour' }
    );

    expect(query).not.toContain('exception.type');
    expect(query).not.toContain('app.installation.id');
    expect(query).toContain('EVAL users = 0, exceptions = 0');
  });
});
