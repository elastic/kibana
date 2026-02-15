/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  handleMultilineStringFormatter,
  inlineSourceFormatter,
  replaceStringWithParams,
  formatMWs,
} from './formatting_utils';
import { loggerMock } from '@kbn/logging-mocks';
import { ConfigKey } from '../../../common/constants/monitor_management';

describe('replaceStringWithParams', () => {
  const logger = loggerMock.create();

  it('replaces params', () => {
    const result = replaceStringWithParams(
      '${homePageUrl}',
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('works with dashes in the key', () => {
    const result = replaceStringWithParams(
      '${home-page-url}',
      { 'home-page-url': 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('works with . in the key', () => {
    const result = replaceStringWithParams(
      '${home.pageUrl}',
      { 'home.pageUrl': 'https://elastic.co' },
      logger
    );

    expect(result).toEqual('https://elastic.co');
  });

  it('returns same value in case no param', () => {
    const result = replaceStringWithParams('${homePageUrl}', {}, logger);

    expect(result).toEqual('${homePageUrl}');
  });

  it('works on objects', () => {
    const result = replaceStringWithParams(
      { key: 'Basic ${homePageUrl}' },
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual({ key: 'Basic https://elastic.co' });
  });

  it('works on arrays', () => {
    const result = replaceStringWithParams(
      ['Basic ${homePageUrl}'],
      { homePageUrl: 'https://elastic.co' },
      logger
    );

    expect(result).toEqual(['Basic https://elastic.co']);
  });

  it('works on multiple', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl} ${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });

  it('works on multiple without spaces', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.cohttps://elastic.co/product');
  });

  it('works on multiple without spaces and one missing', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1}',
      { homePageUrl: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co${homePageUrl1}');
  });

  it('works on multiple without with default', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl}${homePageUrl1:test}',
      { homePageUrl: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.cotest');
  });

  it('works on multiple with multiple defaults', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl:test}${homePageUrl1:test4}',
      { homePageUrl3: 'https://elastic.co', homePageUrl2: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic testtest4');
  });

  it('works with default value', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl:https://elastic.co} ${homePageUrl1}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co https://elastic.co/product');
  });

  it('works with $ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  $auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  $auth');
  });

  it('works with ${ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  ${auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${auth');
  });
  it('works with { as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {auth',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {auth');
  });
  it('works with {} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {}');
  });
  it('works with {$ as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  {$',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  {$');
  });

  it('works with ${} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic  ${} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${} value');
  });

  it('works with ${host.name} for missing params', () => {
    const result = replaceStringWithParams(
      'Basic  ${host.name} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic  ${host.name} value');
  });

  it('works with ${host.name} one missing params', () => {
    const result = replaceStringWithParams(
      'Basic ${host.name} ${homePageUrl1} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic ${host.name} https://elastic.co/product value');
  });

  it('works with ${host.name} just missing params', () => {
    const result = replaceStringWithParams(
      '${host.name} ${homePageUrl1}',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('${host.name} https://elastic.co/product');
  });

  it('works with } ${abc} as part of value', () => {
    const result = replaceStringWithParams(
      'Basic } ${homePageUrl1} value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic } https://elastic.co/product value');
  });

  it('works with ${abc} { as part of value', () => {
    const result = replaceStringWithParams(
      'Basic ${homePageUrl1} { value',
      { homePageUrl1: 'https://elastic.co/product' },
      logger
    );

    expect(result).toEqual('Basic https://elastic.co/product { value');
  });

  it("returns value as string | null when no params and it's an object", () => {
    const result = replaceStringWithParams({}, { param: '1' }, logger);

    expect(result).toEqual({});
  });

  it(`should replace $ {} with adding $ in start for template literal`, () => {
    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: 'const a = ${b}; const c = ${d}',
      },
      ConfigKey.SOURCE_INLINE
    );
    expect(value).toEqual('const a = $${b}; const c = $${d}');
  });
});

describe('handleMultilineStringFormatter', () => {
  it('should handle multiline strings', () => {
    const value = handleMultilineStringFormatter("const a = 'line1\nline2';");
    expect(value).toEqual(`const a = 'line1\n\nline2';`);
  });

  it('should handle multiline strings with template literals', () => {
    const value = handleMultilineStringFormatter(
      `-----BEGIN CERTIFICATE-----\nMIICMJBgNV\n\npAqElJlQND\n-----END CERTIFICATE-----`
    );
    expect(value).toEqual(
      `-----BEGIN CERTIFICATE-----\n\nMIICMJBgNV\n\n\npAqElJlQND\n\n-----END CERTIFICATE-----`
    );
    expect(JSON.stringify(value)).toEqual(
      '"-----BEGIN CERTIFICATE-----\\n\\nMIICMJBgNV\\n\\n\\npAqElJlQND\\n\\n-----END CERTIFICATE-----"'
    );
  });
});

describe('formatMWs', () => {
  const createMockMW = (overrides = {}) => ({
    id: 'test-mw-id',
    title: 'Test MW',
    enabled: true,
    expirationDate: new Date('2025-12-31').toISOString(),
    events: [{ gte: '2023-02-26T00:00:00.000Z', lte: '2023-02-26T01:00:00.000Z' }],
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    eventStartTime: null,
    eventEndTime: null,
    status: 'upcoming' as const,
    schedule: {
      custom: {
        start: '2023-02-26T00:00:00.000Z',
        duration: '1h',
        timezone: 'UTC',
        recurring: {
          every: '1w',
          occurrences: 2,
        },
      },
    },
    ...overrides,
  });

  it('should return undefined when mws is undefined', () => {
    const result = formatMWs(undefined);
    expect(result).toBeUndefined();
  });

  it('should format maintenance windows with schedule', () => {
    const mws = [createMockMW()];

    const result = formatMWs(mws);
    expect(result).toBeDefined();
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      freq: 'weekly',
      duration: '3600000ms',
    });
    expect(parsed[0].rRule).toBeDefined();
  });

  it('should handle maintenance windows with different duration formats', () => {
    const mws = [
      createMockMW({
        id: 'test-mw-minutes',
        schedule: {
          custom: {
            start: '2023-02-26T00:00:00.000Z',
            duration: '45m',
            timezone: 'UTC',
          },
        },
      }),
      createMockMW({
        id: 'test-mw-hours',
        schedule: {
          custom: {
            start: '2023-02-26T00:00:00.000Z',
            duration: '3h',
            timezone: 'UTC',
          },
        },
      }),
      createMockMW({
        id: 'test-mw-days',
        schedule: {
          custom: {
            start: '2023-02-26T00:00:00.000Z',
            duration: '2d',
            timezone: 'UTC',
          },
        },
      }),
    ];

    const result = formatMWs(mws, false) as any[];
    expect(result[0].duration).toBe('2700000ms'); // 45 minutes
    expect(result[1].duration).toBe('10800000ms'); // 3 hours
    expect(result[2].duration).toBe('172800000ms'); // 2 days
  });
});
