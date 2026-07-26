/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIntegrationsTSV, MAX_INTEGRATIONS_LIMIT } from './route';

describe('parseIntegrationsTSV', () => {
  it('returns an empty array for empty input', () => {
    expect(parseIntegrationsTSV('')).toEqual([]);
    expect(parseIntegrationsTSV('  ')).toEqual([]);
    expect(parseIntegrationsTSV('\n')).toEqual([]);
  });

  it('parses a single registry integration', () => {
    const result = parseIntegrationsTSV('nginx\tregistry');
    expect(result).toEqual([
      {
        pkgName: 'nginx',
        installSource: 'registry',
        metadata: undefined,
      },
    ]);
  });

  it('parses a registry integration with hostname metadata (system)', () => {
    const result = parseIntegrationsTSV('system\tregistry\tmy-host');
    expect(result).toEqual([
      {
        pkgName: 'system',
        installSource: 'registry',
        metadata: { hostname: 'my-host' },
      },
    ]);
  });

  it('parses a single custom integration', () => {
    const result = parseIntegrationsTSV('my_app\tcustom\t/var/log/app/access.log');
    expect(result).toEqual([
      {
        pkgName: 'my_app',
        installSource: 'custom',
        logFilePaths: ['/var/log/app/access.log'],
      },
    ]);
  });

  it('merges custom integrations with the same name into one with multiple logFilePaths', () => {
    const tsv = [
      'var_log_app\tcustom\t/var/log/app/access.log',
      'var_log_app\tcustom\t/var/log/app/error.log',
      'var_log_app\tcustom\t/var/log/app/debug.log',
    ].join('\n');

    const result = parseIntegrationsTSV(tsv);
    expect(result).toEqual([
      {
        pkgName: 'var_log_app',
        installSource: 'custom',
        logFilePaths: [
          '/var/log/app/access.log',
          '/var/log/app/error.log',
          '/var/log/app/debug.log',
        ],
      },
    ]);
  });

  it('parses a mix of registry and custom integrations', () => {
    const tsv = [
      'system\tregistry\tmy-host',
      'nginx\tregistry',
      'var_log_app\tcustom\t/var/log/app/access.log',
      'var_log_app\tcustom\t/var/log/app/error.log',
    ].join('\n');

    const result = parseIntegrationsTSV(tsv);
    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        {
          pkgName: 'system',
          installSource: 'registry',
          metadata: { hostname: 'my-host' },
        },
        {
          pkgName: 'nginx',
          installSource: 'registry',
          metadata: undefined,
        },
        {
          pkgName: 'var_log_app',
          installSource: 'custom',
          logFilePaths: ['/var/log/app/access.log', '/var/log/app/error.log'],
        },
      ])
    );
  });

  it('throws when a custom integration is missing its file path', () => {
    expect(() => parseIntegrationsTSV('my_app\tcustom')).toThrow(
      'Missing file path for integration: my_app'
    );
  });

  it('throws when install source is invalid', () => {
    expect(() => parseIntegrationsTSV('my_app\tinvalid\t/some/path')).toThrow(
      'Invalid install source: invalid'
    );
  });

  describe('integration limit enforcement', () => {
    it('does not throw when many TSV lines merge into fewer unique integrations than the limit', () => {
      const directories = ['var_log_app', 'var_log_nginx', 'var_log_redis'];
      const lines: string[] = [];

      for (let i = 0; i < 179; i++) {
        const dir = directories[i % directories.length];
        lines.push(`${dir}\tcustom\t/var/log/${dir}/file_${i}.log`);
      }

      const tsv = lines.join('\n');

      const result = parseIntegrationsTSV(tsv);
      expect(result).toHaveLength(3);

      for (const integration of result) {
        if (integration.installSource === 'custom') {
          expect(integration.logFilePaths.length).toBeGreaterThan(1);
        }
      }
    });

    it('throws when unique integrations exceed the limit', () => {
      const lines: string[] = [];
      for (let i = 0; i < MAX_INTEGRATIONS_LIMIT + 1; i++) {
        lines.push(`integration_${i}\tcustom\t/var/log/svc_${i}/app.log`);
      }

      const tsv = lines.join('\n');

      expect(() => parseIntegrationsTSV(tsv)).toThrow(
        `Too many integrations in the request. Maximum allowed is ${MAX_INTEGRATIONS_LIMIT}, but received ${
          MAX_INTEGRATIONS_LIMIT + 1
        }.`
      );
    });

    it('does not throw when unique integrations are exactly at the limit', () => {
      const lines: string[] = [];
      for (let i = 0; i < MAX_INTEGRATIONS_LIMIT; i++) {
        lines.push(`integration_${i}\tcustom\t/var/log/svc_${i}/app.log`);
      }

      const tsv = lines.join('\n');

      const result = parseIntegrationsTSV(tsv);
      expect(result).toHaveLength(MAX_INTEGRATIONS_LIMIT);
    });
  });
});
