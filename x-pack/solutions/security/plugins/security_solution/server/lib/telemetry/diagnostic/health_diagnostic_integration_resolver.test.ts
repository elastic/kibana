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
      { dataset: 'endpoint.events.network', type: 'traces' },
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
    it('produces one ExecutableQuery per matched integration (exact name)', async () => {
      const query = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('executable');
      if (results[0].kind !== 'executable') throw new Error('type guard');
      expect(results[0].query.version).toBe(2);

      const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
      expect(resolution.name).toBe('endpoint');
      expect(resolution.version).toBe('8.14.2');
      expect(resolution.indices).toContain('logs-endpoint.events.process-*');
      expect(resolution.indices).toContain('logs-endpoint.events.network-*');
    });

    it('produces one ExecutableQuery per matched integration (regex pattern)', async () => {
      const query = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint.*'] });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('executable');
    });

    it('produces N ExecutableQueries for N matched integrations', async () => {
      const query = createMockQueryV2(QueryType.DSL, {
        integrations: ['endpoint', 'fleet_server'],
      });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.kind === 'executable')).toBe(true);
      const names = results.map(
        (r) => (r as { resolution: IntegrationResolution }).resolution.name
      );
      expect(names).toContain('endpoint');
      expect(names).toContain('fleet_server');
    });

    describe('datastreamTypes filtering', () => {
      it('includes only datastreams matching the type patterns', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint'],
          datastreamTypes: ['logs'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(1);
        const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
        expect(resolution.indices).toHaveLength(2);
        expect(resolution.indices).toContain('logs-endpoint.events.process-*');
        expect(resolution.indices).toContain('logs-endpoint.events.network-*');
      });

      it('skips an integration when no datastreams match the type pattern', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint'],
          datastreamTypes: ['metrics'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(1);
        expect(results[0].kind).toBe('skipped');
        if (results[0].kind !== 'skipped') throw new Error('type guard');
        expect(results[0].reason).toBe('datastreams_not_matched');
      });

      it('supports regex patterns in datastreamTypes', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint'],
          datastreamTypes: ['log.*'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(1);
        expect(results[0].kind).toBe('executable');
      });

      it('includes all datastreams when datastreamTypes is absent', async () => {
        const query = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
        const results = await resolver.resolve([query]);

        const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
        expect(resolution.indices).toHaveLength(3);
      });

      it('selects only traces datastreams when filtering by traces', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint'],
          datastreamTypes: ['traces'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(1);
        expect(results[0].kind).toBe('executable');
        const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
        expect(resolution.indices).toHaveLength(1);
        expect(resolution.indices).toContain('traces-endpoint.events.network-*');
        expect(resolution.indices).not.toContain('logs-endpoint.events.process-*');
        expect(resolution.indices).not.toContain('logs-endpoint.events.network-*');
      });

      it('produces executable for integration with matching type and skipped for one without', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint', 'fleet_server'],
          datastreamTypes: ['traces'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(2);
        const endpointResult = results.find(
          (r) =>
            'resolution' in r &&
            (r as { resolution: IntegrationResolution }).resolution.name === 'endpoint'
        );
        const fleetResult = results.find(
          (r) =>
            !('resolution' in r) ||
            (r as { resolution: IntegrationResolution }).resolution.name === 'fleet_server'
        );
        expect(endpointResult?.kind).toBe('executable');
        expect(fleetResult?.kind).toBe('skipped');
        if (fleetResult?.kind !== 'skipped') throw new Error('type guard');
        expect(fleetResult.reason).toBe('datastreams_not_matched');
      });

      it('matches multiple types with a regex alternation pattern', async () => {
        const query = createMockQueryV2(QueryType.DSL, {
          integrations: ['endpoint'],
          datastreamTypes: ['logs|traces'],
        });
        const results = await resolver.resolve([query]);

        expect(results).toHaveLength(1);
        expect(results[0].kind).toBe('executable');
        const resolution = (results[0] as { resolution: IntegrationResolution }).resolution;
        expect(resolution.indices).toHaveLength(3);
      });
    });

    test.each([
      ['pattern matches nothing', ['nonexistent.*']],
      ['package exists but is not_installed', ['system']],
    ])('returns a single SkippedQuery — %s', async (_label, integrations) => {
      const query = createMockQueryV2(QueryType.DSL, { integrations });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('integration_not_installed');
      expect('resolution' in results[0]).toBe(false);
    });

    it('skips v2 ESQL query with FROM clause', async () => {
      const query = createMockQueryV2(QueryType.ESQL, {
        integrations: ['endpoint'],
        query: 'FROM logs-* | stats count() by user.name',
      });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('unsupported_query');
    });

    it('calls Fleet only once even for multiple v2 queries', async () => {
      const q1 = createMockQueryV2(QueryType.DSL, { id: 'q1', integrations: ['endpoint'] });
      const q2 = createMockQueryV2(QueryType.DSL, { id: 'q2', integrations: ['fleet_server'] });
      await resolver.resolve([q1, q2]);

      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fleet unavailability', () => {
    beforeEach(() => {
      packageService.asInternalUser.getPackages.mockRejectedValue(new Error('Fleet is down'));
    });

    it('returns fleet_unavailable SkippedQuery for each v2 query when Fleet call fails', async () => {
      const q1 = createMockQueryV2(QueryType.DSL, { id: 'q1', integrations: ['endpoint'] });
      const q2 = createMockQueryV2(QueryType.DSL, { id: 'q2', integrations: ['fleet_server'] });
      const results = await resolver.resolve([q1, q2]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.kind === 'skipped')).toBe(true);
      results.forEach((r) => {
        if (r.kind !== 'skipped') throw new Error('type guard');
        expect(r.reason).toBe('fleet_unavailable');
      });
    });

    it('still runs v1 queries when Fleet call fails', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const results = await resolver.resolve([v1, v2]);

      expect(results).toHaveLength(2);
      expect(results[0].kind).toBe('executable');
      if (results[0].kind !== 'executable') throw new Error('type guard');
      expect(results[0].query.version).toBe(1);

      expect(results[1].kind).toBe('skipped');
      if (results[1].kind !== 'skipped') throw new Error('type guard');
      expect(results[1].reason).toBe('fleet_unavailable');
    });

    it('does not call Fleet when there are only v1 queries', async () => {
      packageService.asInternalUser.getPackages.mockClear();
      const v1 = createMockQueryV1(QueryType.DSL);
      await resolver.resolve([v1]);

      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });
  });

  describe('v2 with direct index', () => {
    it('returns ExecutableQuery without resolution when index is set', async () => {
      const query = createMockQueryV2(QueryType.DSL, {
        integrations: undefined,
        index: 'logs-test-*',
      });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('executable');
      if (results[0].kind !== 'executable') throw new Error('type guard');
      expect(results[0].query.version).toBe(2);
      expect('resolution' in results[0]).toBe(false);
    });

    it('does not call Fleet when index is set', async () => {
      const query = createMockQueryV2(QueryType.DSL, {
        integrations: undefined,
        index: 'logs-test-*',
      });
      await resolver.resolve([query]);

      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });

    it('executes index-based v2 query even when Fleet is unavailable', async () => {
      packageService.asInternalUser.getPackages.mockRejectedValue(new Error('Fleet is down'));

      const query = createMockQueryV2(QueryType.DSL, {
        integrations: undefined,
        index: 'logs-test-*',
      });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('executable');
    });

    it('skips index-based v2 ESQL query with FROM clause', async () => {
      const query = createMockQueryV2(QueryType.ESQL, {
        integrations: undefined,
        index: 'logs-test-*',
        query: 'FROM logs-* | stats count() by user.name',
      });
      const results = await resolver.resolve([query]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('unsupported_query');
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });

    it('resolves index-based v2 alongside integrations-based v2 in one call', async () => {
      const indexQuery = createMockQueryV2(QueryType.DSL, {
        id: 'q-index',
        integrations: undefined,
        index: 'logs-test-*',
      });
      const integrationsQuery = createMockQueryV2(QueryType.DSL, {
        id: 'q-integrations',
        integrations: ['endpoint'],
      });
      const results = await resolver.resolve([indexQuery, integrationsQuery]);

      expect(results).toHaveLength(2);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('executable');
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });
  });

  describe('unknown version queries', () => {
    it('returns SkippedQuery for ParseFailureQuery', async () => {
      const unknown = { version: 99, id: 'future', name: 'future', _raw: {} };
      const results = await resolver.resolve([unknown]);

      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe('skipped');
      if (results[0].kind !== 'skipped') throw new Error('type guard');
      expect(results[0].reason).toBe('parse_failure');
    });
  });

  describe('mixed queries', () => {
    it('handles a mix of v1, v2, and unknown queries in one call', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const unknown = { version: 99, id: 'x', name: 'x', _raw: {} };

      const results = await resolver.resolve([v1, v2, unknown]);

      expect(results).toHaveLength(3); // 1 v1 + 1 v2 (1 integration) + 1 unknown
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('executable');
      expect(results[2].kind).toBe('skipped');
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });

    it('expands v2 with two matched integrations to two ExecutableQueries', async () => {
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint', 'fleet_server'] });
      const results = await resolver.resolve([v2]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.kind === 'executable')).toBe(true);
    });
  });
});
