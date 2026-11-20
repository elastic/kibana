/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  esqlString,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobilePanelDiscoverEsql,
  mobilePanelEsql,
  toComparedValue,
} from './mobile_panel';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

describe('esqlString', () => {
  it('escapes quotes and backslashes so a value cannot end the string', () => {
    expect(esqlString('a"b\\c')).toBe('"a\\"b\\\\c"');
  });
});

describe('mobilePanelEsql', () => {
  it('applies the SDK detection and the service, not the SDK language', () => {
    const query = mobilePanelEsql({ serviceName: 'shop-mobile' });

    expect(query).toContain('FROM traces-*.otel-*,logs-*.otel-*');
    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(query).toContain('service.name == "shop-mobile"');
    expect(query).not.toContain('sdk.language');
  });

  it('applies the platform and the release, matching the release with or without a build', () => {
    const query = mobilePanelEsql({ serviceName: 'shop', platform: 'ios', release: '1.2.3' });

    expect(query).toContain('resource.attributes.telemetry.sdk.name == "iOS"');
    expect(query).not.toContain('os.name');
    expect(query).toContain('service.version == "1.2.3"');
    expect(query).toContain('STARTS_WITH(service.version, "1.2.3 (")');
    expect(query).toContain('STARTS_WITH(service.version, "1.2.3+")');
  });

  it('carries the environment over to the Discover query', () => {
    expect(mobilePanelDiscoverEsql({ serviceName: 'shop' }, 'hour', 'production')).toContain(
      '| WHERE (service.environment == "production" OR resource.attributes.deployment.environment.name == "production")'
    );
    expect(
      mobilePanelDiscoverEsql({ serviceName: 'shop' }, 'hour', 'ENVIRONMENT_NOT_DEFINED')
    ).toContain(
      '(service.environment IS NULL AND resource.attributes.deployment.environment.name IS NULL)'
    );
    expect(
      mobilePanelDiscoverEsql({ serviceName: 'shop' }, 'hour', 'ENVIRONMENT_ALL')
    ).not.toContain('environment');
  });

  it('carries the filters over to the Discover query', () => {
    const query = mobilePanelDiscoverEsql({ serviceName: 'shop', platform: 'android' }, 'day');

    expect(query).toContain('telemetry.sdk.name == "android"');
    expect(query).toContain('BUCKET(@timestamp, 1 day)');
  });
});
