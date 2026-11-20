/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INLINE_VALUES,
  PLATFORM_BY_SDK_NAME,
  createParamValues,
  getMobileTimeBucket,
  getPreviousPeriod,
  mobileEnvironmentCondition,
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

describe('PLATFORM_BY_SDK_NAME', () => {
  it('is the platform of each lower-cased SDK name', () => {
    expect(PLATFORM_BY_SDK_NAME).toEqual({ android: 'android', ios: 'ios' });
  });
});

describe('mobilePanelEsql', () => {
  it('reads unmapped fields as null, then applies the SDK detection, not the SDK language', () => {
    const query = mobilePanelEsql({ serviceName: 'shop-mobile' }, INLINE_VALUES);

    expect(query).toMatch(
      /^SET unmapped_fields = "NULLIFY";\nFROM traces-\*\.otel-\*,logs-\*\.otel-\*/
    );
    expect(query).toContain('resource.attributes.telemetry.sdk.name IN ("android", "iOS")');
    expect(query).not.toContain('sdk.language');
  });

  it('sends the values as params on the routes', () => {
    const values = createParamValues();

    const query = mobilePanelEsql(
      { serviceName: 'shop-mobile', platform: 'ios', release: '1.2.3' },
      values
    );

    expect(query).toContain('service.name == ?service_name');
    expect(query).toContain('resource.attributes.telemetry.sdk.name == "iOS"');
    expect(query).toContain('service.version == ?release');
    expect(query).not.toContain('os.name');
    expect(values.params).toEqual([{ service_name: 'shop-mobile' }, { release: '1.2.3' }]);
  });

  it('escapes the values, newlines included, when written into the query', () => {
    const query = mobilePanelEsql({ serviceName: 'a"b\\c\nd' }, INLINE_VALUES);

    expect(query).toContain('service.name == "a\\"b\\\\c\\nd"');
  });
});

describe('mobileEnvironmentCondition', () => {
  it('filters nothing for all environments', () => {
    expect(mobileEnvironmentCondition(undefined, INLINE_VALUES)).toBeUndefined();
    expect(mobileEnvironmentCondition('ENVIRONMENT_ALL', INLINE_VALUES)).toBeUndefined();
  });

  it('matches either environment field', () => {
    expect(mobileEnvironmentCondition('production', INLINE_VALUES)).toBe(
      '(service.environment == "production" OR resource.attributes.deployment.environment.name == "production")'
    );
  });

  it(`matches APM's sentinel or no environment for "Not defined"`, () => {
    expect(mobileEnvironmentCondition('ENVIRONMENT_NOT_DEFINED', INLINE_VALUES)).toBe(
      '(service.environment == "ENVIRONMENT_NOT_DEFINED" OR (service.environment IS NULL AND resource.attributes.deployment.environment.name IS NULL))'
    );
  });
});

describe('mobilePanelDiscoverEsql', () => {
  it('writes the filters and the environment into the query, as Discover takes no params', () => {
    const query = mobilePanelDiscoverEsql(
      { serviceName: 'shop', platform: 'android', release: '2.0.0' },
      { bucket: 'day', environment: 'production' }
    );

    expect(query).toContain('service.name == "shop"');
    expect(query).toContain('telemetry.sdk.name == "android"');
    expect(query).toContain('service.version == "2.0.0"');
    expect(query).toContain('| WHERE (service.environment == "production"');
    expect(query).toContain('BUCKET(@timestamp, 1 day)');
    expect(query).not.toContain('?');
  });
});
