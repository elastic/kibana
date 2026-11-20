/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getMobileTimeBucket,
  getPreviousPeriod,
  mobileDocuments,
  mobilePanelDiscoverEsql,
  mobilePanelQuery,
  toComparedValue,
  withEnvironment,
  withKpiStats,
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

describe('mobileDocuments', () => {
  const { query } = mobileDocuments().toRequest();

  it('reads unmapped fields as null', () => {
    expect(query).toMatch(
      /^SET unmapped_fields = "nullify"; FROM traces-\*\.otel-\*, logs-\*\.otel-\*/
    );
  });

  it('keeps a mobile SDK name, or the Elastic distribution on a mobile os.name, iPadOS included', () => {
    expect(query).toContain(
      'WHERE (`telemetry.sdk.name` IN ("android", "iOS")) OR `resource.attributes.telemetry.distro.name` == "elastic" AND (`resource.attributes.os.name` IN ("Android", "iOS", "iPadOS"))'
    );
  });

  it('leaves out EDOT Browser, which reports the device OS too, e.g. iOS on an iPhone', () => {
    expect(query).toContain('COALESCE(`telemetry.sdk.language`, "") != "webjs"');
  });

  it('derives the platform from os.name or the SDK name, not from os.type', () => {
    expect(query).toContain(
      'EVAL platform = CASE((`resource.attributes.os.name` IN ("Android")) OR `telemetry.sdk.name` == "android", "android", "ios")'
    );
    expect(query).not.toContain('os.type');
  });
});

describe('mobilePanelQuery', () => {
  it('sends the request values as params', () => {
    const { query, params } = withKpiStats(
      mobilePanelQuery({ serviceName: 'shop-mobile', osName: 'iPadOS', release: '1.2.3' })
    ).toRequest();

    expect(query).toContain('`service.name` == ?service_name');
    expect(query).toContain('`resource.attributes.os.name` == ?os_name');
    expect(query).toContain('`service.version` == ?release');
    expect(query).toContain('sessions = COUNT_DISTINCT(`attributes.session.id`)');
    expect(params).toEqual([
      { service_name: 'shop-mobile' },
      { os_name: 'iPadOS' },
      { release: '1.2.3' },
    ]);
  });

  it('covers every platform without an OS filter', () => {
    const { query } = mobilePanelQuery({ serviceName: 'shop-mobile' }).toRequest();

    expect(query).not.toContain('?os_name');
    expect(query).not.toContain('platform ==');
  });
});

describe('withEnvironment', () => {
  const print = (environment?: string) =>
    withEnvironment(mobileDocuments(), environment).print('basic');

  it('filters nothing for all environments', () => {
    expect(print(undefined)).toBe(mobileDocuments().print('basic'));
    expect(print('ENVIRONMENT_ALL')).toBe(mobileDocuments().print('basic'));
  });

  it('matches either environment field', () => {
    expect(print('production')).toContain(
      '| WHERE `service.environment` == "production" OR `resource.attributes.deployment.environment.name` == "production"'
    );
  });

  it(`matches APM's sentinel or no environment for "Not defined"`, () => {
    expect(print('ENVIRONMENT_NOT_DEFINED')).toContain(
      // AND binds tighter than OR, so the composer needs no parentheses.
      '| WHERE `service.environment` == "ENVIRONMENT_NOT_DEFINED" OR `service.environment` IS NULL AND `resource.attributes.deployment.environment.name` IS NULL'
    );
  });
});

describe('mobilePanelDiscoverEsql', () => {
  it('writes the filters and the environment into the query, as Discover takes no params', () => {
    const query = mobilePanelDiscoverEsql(
      { serviceName: 'a"b\nc', osName: 'Android', release: '2.0.0' },
      { bucket: 'day', environment: 'production' }
    );

    expect(query).toContain('`service.name` == "a\\"b\\nc"');
    expect(query).toContain('`resource.attributes.os.name` == "Android"');
    expect(query).toContain('`service.version` == "2.0.0"');
    expect(query).toContain('`service.environment` == "production"');
    expect(query).toContain('BUCKET(@timestamp, 1 day)');
    expect(query).not.toContain('?');
  });
});
