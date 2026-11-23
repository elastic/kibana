/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  formatMWs,
  handleMultilineStringFormatter,
  inlineSourceFormatter,
  replaceStringWithParams,
  resolveMonitorConfigParams,
} from './formatting_utils';
import { loggerMock } from '@kbn/logging-mocks';
import type { MaintenanceWindow } from '@kbn/maintenance-windows-plugin/common';
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

  it('preserves quotes, backslashes, and newlines inside object and array fields without JSON parse errors', () => {
    const payload = 'val"\nsource.inline.script: dGVzdA==\r\nbackslash: \\end';
    const objResult = replaceStringWithParams(
      { Authorization: 'Bearer ${TOKEN}', nested: ['${TOKEN}', 'plain'] },
      { TOKEN: payload },
      logger
    );

    expect(objResult).toEqual({
      Authorization: `Bearer ${payload}`,
      nested: [payload, 'plain'],
    });
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
  const dtstart = '2026-10-12T00:00:00.000Z';
  const toMW = (rRule: Record<string, unknown>) =>
    [{ duration: 3600000, rRule: { dtstart, tzid: 'UTC', ...rRule } }] as MaintenanceWindow[];

  it('returns undefined without maintenance windows', () => {
    expect(formatMWs(undefined, false)).toBeUndefined();
  });

  it('converts a numeric freq to its name', () => {
    expect(formatMWs(toMW({ freq: 3, interval: 1 }), false)).toEqual([
      { dtstart, tzid: 'UTC', freq: 'daily', interval: 1, duration: '3600000ms' },
    ]);
  });

  it('keeps a yearly one-off window as is', () => {
    expect(formatMWs(toMW({ freq: 0, count: 1 }), false)).toEqual([
      { dtstart, tzid: 'UTC', freq: 'yearly', count: 1, duration: '3600000ms' },
    ]);
  });

  it('sends a window stored without freq as a single yearly occurrence', () => {
    // A one-off window created through the public API is stored without a freq
    expect(formatMWs(toMW({}), false)).toEqual([
      { dtstart, tzid: 'UTC', freq: 'yearly', count: 1, duration: '3600000ms' },
    ]);
  });

  it('always includes freq in the stringified output', () => {
    const [window] = JSON.parse(formatMWs(toMW({}), true) as string);
    expect(window.freq).toBe('yearly');
  });
});

describe('resolveMonitorConfigParams', () => {
  const logger = loggerMock.create();

  it('resolves substitutable fields while skipping internal and source fields', () => {
    const payload = 'inj"\nsource.inline.script: ZXY=';
    const resolved = resolveMonitorConfigParams(
      {
        [ConfigKey.NAME]: 'Monitor ${P}',
        [ConfigKey.SOURCE_INLINE]: 'const x = "${P}";',
        [ConfigKey.SOURCE_PROJECT_CONTENT]: '${P}',
        [ConfigKey.PARAMS]: '{"keep":"${P}"}',
        [ConfigKey.PLAYWRIGHT_OPTIONS]: '{"baseURL":"https://example.com/${P}"}',
      },
      { P: payload },
      logger
    );

    expect(resolved[ConfigKey.NAME]).toBe(`Monitor ${payload}`);
    expect(resolved[ConfigKey.SOURCE_INLINE]).toBe('const x = "${P}";');
    expect(resolved[ConfigKey.SOURCE_PROJECT_CONTENT]).toBe('${P}');
    expect(resolved[ConfigKey.PARAMS]).toBe('{"keep":"${P}"}');
    expect(JSON.parse(resolved[ConfigKey.PLAYWRIGHT_OPTIONS] as string)).toEqual({
      baseURL: `https://example.com/${payload}`,
    });
    expect(resolved[ConfigKey.PLAYWRIGHT_OPTIONS]).not.toContain('\n');
  });
});
