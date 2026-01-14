/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  handleMultilineStringFormatter,
  inlineSourceFormatter,
  monitorUsesGlobalParams,
  replaceStringWithParams,
  valueContainsParams,
} from './formatting_utils';
import { loggerMock } from '@kbn/logging-mocks';
import { ConfigKey } from '../../../common/constants/monitor_management';
import type { SyntheticsMonitor } from '../../../common/runtime_types';
import {
  CodeEditorMode,
  MonitorTypeEnum,
  ScheduleUnit,
} from '../../../common/runtime_types/monitor_management/monitor_configs';

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

describe('valueContainsParams', () => {
  it('returns true for string with params', () => {
    expect(valueContainsParams('${apiKey}')).toBe(true);
  });

  it('returns false for string without params', () => {
    expect(valueContainsParams('no params')).toBe(false);
  });

  it('returns true for object with params in values', () => {
    expect(valueContainsParams({ url: '${baseUrl}/api' })).toBe(true);
  });

  it('returns false for object without params', () => {
    expect(valueContainsParams({ url: 'https://example.com' })).toBe(false);
  });

  it('returns true for array with params', () => {
    expect(valueContainsParams(['${item1}', 'static'])).toBe(true);
  });

  it('returns false for array without params', () => {
    expect(valueContainsParams(['item1', 'item2'])).toBe(false);
  });

  it('returns false for null', () => {
    expect(valueContainsParams(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(valueContainsParams(undefined)).toBe(false);
  });

  it('returns false for boolean', () => {
    expect(valueContainsParams(true)).toBe(false);
  });

  it('returns false for number', () => {
    expect(valueContainsParams(123)).toBe(false);
  });
});

describe('monitorUsesGlobalParams', () => {
  const baseMonitor: Partial<SyntheticsMonitor> = {
    [ConfigKey.NAME]: 'Test Monitor',
    [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.HTTP,
    [ConfigKey.ENABLED]: true,
    [ConfigKey.SCHEDULE]: { unit: ScheduleUnit.MINUTES, number: '5' },
    [ConfigKey.LOCATIONS]: [],
    [ConfigKey.NAMESPACE]: 'default',
  };

  it('returns true when monitor URL contains global params', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: '${baseUrl}/api/health',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in request headers', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.REQUEST_HEADERS_CHECK]: { Authorization: 'Bearer ${apiToken}' },
    } as unknown as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in request body', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.REQUEST_BODY_CHECK]: {
        value: '{"key": "${secretKey}"}',
        type: CodeEditorMode.JSON,
      },
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in username', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.USERNAME]: '${username}',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in password', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.PASSWORD]: '${password}',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in proxy URL', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.PROXY_URL]: '${proxyHost}:8080',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns false when monitor has no global params', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com/api/health',
      [ConfigKey.REQUEST_HEADERS_CHECK]: { 'Content-Type': 'application/json' },
    } as unknown as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(false);
  });

  it('returns false for minimal monitor without params', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(false);
  });

  it('ignores params in PARAMS_KEYS_TO_SKIP fields', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      // PARAMS is in PARAMS_KEYS_TO_SKIP, so it should be ignored
      [ConfigKey.PARAMS]: '{"localParam": "${shouldBeIgnored}"}',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(false);
  });

  it('returns true when monitor has params in hosts field (TCP/ICMP)', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.MONITOR_TYPE]: MonitorTypeEnum.TCP,
      [ConfigKey.HOSTS]: '${tcpHost}:443',
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });

  it('returns true when monitor has params in response body check', () => {
    const monitor = {
      ...baseMonitor,
      [ConfigKey.URLS]: 'https://example.com',
      [ConfigKey.RESPONSE_BODY_CHECK_POSITIVE]: ['${expectedResponse}'],
    } as SyntheticsMonitor;

    expect(monitorUsesGlobalParams(monitor)).toBe(true);
  });
});
