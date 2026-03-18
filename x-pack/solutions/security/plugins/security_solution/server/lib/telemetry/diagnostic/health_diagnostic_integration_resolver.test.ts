/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationResolverImpl } from './health_diagnostic_integration_resolver';
import { QueryType, type IntegrationResolution } from './health_diagnostic_service.types';
import type { PackageService } from '@kbn/fleet-plugin/server';
import {
  createMockLogger,
  createMockQueryV1,
  createMockQueryV2,
  createMockPackageService,
} from './__mocks__';

const INSTALLED_PACKAGES = [
  {
    name: 'endpoint',
    version: '8.14.2',
    status: 'installed',
    data_streams: [
      { dataset: 'endpoint.events.process', type: 'logs' },
      { dataset: 'endpoint.events.network', type: 'logs' },
    ],
  },
  {
    name: 'fleet_server',
    version: '1.3.1',
    status: 'installed',
    data_streams: [{ dataset: 'fleet_server.output', type: 'logs' }],
  },
  {
    name: 'system',
    version: '1.0.0',
    status: 'not_installed',
    data_streams: [{ dataset: 'system.cpu', type: 'metrics' }],
  },
];

describe('IntegrationResolverImpl', () => {
  let resolver: IntegrationResolverImpl;
  let packageService: ReturnType<typeof createMockPackageService>;

  beforeEach(() => {
    packageService = createMockPackageService(INSTALLED_PACKAGES);
    resolver = new IntegrationResolverImpl(
      packageService as unknown as PackageService,
      createMockLogger()
    );
  });

  describe('v1 queries', () => {
    it('passes v1 queries through as ExecutableQuery without calling Fleet', async () => {
      const query = createMockQueryV1(QueryType.DSL);
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('executable');
      if (results[0].kind !== 'executable') throw new Error('type guard');
      expect(results[0].query.version).toBe(1);
      expect('resolution' in results[0]).toBe(false);
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });
  });

  describe('v2 queries', () => {
    test.each([
      [
        'exact name',
        ['endpoint'],
        1,
        ['logs-endpoint.events.process-*', 'logs-endpoint.events.network-*'],
      ],
      [
        'regex pattern',
        ['endpoint.*'],
        1,
        ['logs-endpoint.events.process-*', 'logs-endpoint.events.network-*'],
      ],
      ['multiple patterns (OR logic)', ['endpoint', 'fleet_server'], 2, null],
    ])(
      'resolves to ExecutableQuery — %s',
      async (_label, integrations, matchCount, expectedIndices) => {
        const query = createMockQueryV2(QueryType.DSL, { integrations });
        const results = await resolver.resolve([query]);

        expect(results[0].kind).toBe('executable');
        if (results[0].kind !== 'executable') throw new Error('type guard');
        expect(results[0].query.version).toBe(2);

        const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
        expect(resolution.matched).toHaveLength(matchCount);
        if (expectedIndices) {
          expectedIndices.forEach((idx: string) =>
            expect(resolution.resolvedIndices).toContain(idx)
          );
        }
      }
    );

    test.each([
      ['pattern matches nothing', ['nonexistent.*']],
      ['package exists but is not_installed', ['system']],
    ])('returns SkippedQuery — %s', async (_label, integrations) => {
      const query = createMockQueryV2(QueryType.DSL, { integrations });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('integration_not_installed');
      expect(results[0].resolution?.matched).toHaveLength(0);
      expect(results[0].resolution?.resolvedIndices).toHaveLength(0);
    });

    it('calls Fleet only once even for multiple v2 queries', async () => {
      const q1 = createMockQueryV2(QueryType.DSL, { id: 'q1', integrations: ['endpoint'] });
      const q2 = createMockQueryV2(QueryType.DSL, { id: 'q2', integrations: ['fleet_server'] });
      await resolver.resolve([q1, q2]);

      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });
  });

  describe('unknown version queries', () => {
    it('returns SkippedQuery for UnknownVersionQuery', async () => {
      const unknown = { version: 99, id: 'future', name: 'future', _raw: {} };
      const results = await resolver.resolve([unknown]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('unknown_version');
    });
  });

  describe('mixed queries', () => {
    it('handles a mix of v1, v2, and unknown queries in one call', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const unknown = { version: 99, id: 'x', name: 'x', _raw: {} };

      const results = await resolver.resolve([v1, v2, unknown]);

      expect(results).toHaveLength(3);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('executable');
      expect(results[2].kind).toBe('skipped');
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });
  });
});
