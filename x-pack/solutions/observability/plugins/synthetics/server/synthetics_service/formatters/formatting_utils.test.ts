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

  it(`should escape template literals using $$$ for Agent and Heartbeat compatibility`, () => {
    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: 'const a = ${b}; const c = ${d}',
      },
      ConfigKey.SOURCE_INLINE
    );
    // Uses $$$ escape for both Agent AND Heartbeat:
    // - Agent: $$${b} → $${b}
    // - Heartbeat: $${b} → ${b}
    // - JavaScript: ${b} → interpolates
    expect(value).toEqual('const a = $$${b}; const c = $$${d}');
  });

  it(`should escape template literals in realistic browser monitor script`, () => {
    const script = `var host = "https://www.elastic.co";
step(\`Go to \${host}\`, async () => {
  await page.goto(\`\${host}/docs\`, { timeout: 60000, waitUntil: 'domcontentloaded' });
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    // Verify ${host} is escaped to $$${host} for Agent + Heartbeat processing
    expect(value).toContain('`Go to $$${host}`');
    expect(value).toContain('`$$${host}/docs`');
    // Verify the variable declaration is NOT escaped (no ${} pattern)
    expect(value).toContain('var host = "https://www.elastic.co"');
  });

  it(`should handle multiple template literal variables in URL paths`, () => {
    const script = `const baseUrl = "https://example.com";
const path = "/api";
await page.goto(\`\${baseUrl}\${path}/users\`);`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    expect(value).toContain('`$$${baseUrl}$$${path}/users`');
  });

  it(`should handle template literals with expressions`, () => {
    const script = `const id = 123;
await page.goto(\`https://api.example.com/users/\${id}/profile\`);
console.log(\`User ID: \${id * 2}\`);`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    expect(value).toContain('`https://api.example.com/users/$$${id}/profile`');
    expect(value).toContain('`User ID: $$${id * 2}`');
  });

  it(`should handle nested template literals and complex expressions`, () => {
    const script = `const config = { timeout: 5000 };
step(\`Test with timeout \${config.timeout}ms\`, async () => {
  await page.waitForTimeout(\${config.timeout});
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    expect(value).toContain('`Test with timeout $$${config.timeout}ms`');
  });

  it(`should handle journey with params object access`, () => {
    // This script uses params.baseUrl which is a Synthetics param
    // The ${params.baseUrl} should be escaped for Agent/Heartbeat
    // Then JavaScript will access the params object at runtime
    const script = `journey('Test', ({ page, params }) => {
  step('Go to base', async () => {
    await page.goto(\`\${params.baseUrl}/docs\`);
  });
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    expect(value).toContain('`$$${params.baseUrl}/docs`');
  });

  it(`should handle mixed JS variables and params in same template`, () => {
    const script = `journey('Mixed', ({ page, params }) => {
  const path = '/api/v1';
  step('API call', async () => {
    await page.goto(\`\${params.baseUrl}\${path}/users\`);
  });
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    expect(value).toContain('`$$${params.baseUrl}$$${path}/users`');
  });

  it(`should not modify scripts without template literals`, () => {
    const script = `step('Simple test', async () => {
  await page.goto('https://example.com');
  const text = page.locator('h1');
  await expect(text).toBeVisible();
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    // Script should remain unchanged (no ${} to escape)
    expect(value).toEqual(script);
  });

  it(`should handle dollar signs in various contexts`, () => {
    // Dollar signs not followed by { should remain unchanged
    const script = `const price = '$100';
const text = 'Hello';
step(\`Check \${text}\`, async () => {});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    // The template literal ${text} should be escaped
    expect(value).toContain('`Check $$${text}`');
    // Dollar sign not followed by { should remain unchanged
    expect(value).toContain("const price = '$100'");
  });

  it(`should handle multi-step journey with various template patterns`, () => {
    const script = `const baseUrl = 'https://www.elastic.co';
const userId = 42;

journey('Full test', ({ page, params }) => {
  step(\`Navigate to \${baseUrl}\`, async () => {
    await page.goto(\`\${baseUrl}/docs\`);
  });

  step(\`Check user \${userId}\`, async () => {
    await page.goto(\`\${params.apiUrl}/users/\${userId}\`);
  });

  step('Static step', async () => {
    await page.goto('https://example.com');
  });
});`;

    const value = inlineSourceFormatter(
      {
        [ConfigKey.SOURCE_INLINE]: script,
      },
      ConfigKey.SOURCE_INLINE
    );

    // All ${} patterns should be escaped
    expect(value).toContain('`Navigate to $$${baseUrl}`');
    expect(value).toContain('`$$${baseUrl}/docs`');
    expect(value).toContain('`Check user $$${userId}`');
    expect(value).toContain('`$$${params.apiUrl}/users/$$${userId}`');
    // Static strings should remain unchanged
    expect(value).toContain("'https://example.com'");
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
