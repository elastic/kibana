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
  createMockApiQueryV3,
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

    it('returns fleet_unavailable for each v2 integration query when Fleet call fails', async () => {
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

    it('does not call Fleet when only v3 API queries without integrations are present', async () => {
      packageService.asInternalUser.getPackages.mockClear();
      const v3api = createMockApiQueryV3({ integrations: undefined });
      await resolver.resolve([v3api]);

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

  describe('v3 API queries', () => {
    it('returns executable_api without resolution when integrations is absent', async () => {
      const query = createMockApiQueryV3({ integrations: undefined });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable_api');
      if (result[0].kind !== 'executable_api') throw new Error('type guard');
      expect('resolution' in result[0]).toBe(false);
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });

    it('returns executable_api without resolution when integrations is an empty array', async () => {
      const query = createMockApiQueryV3({ integrations: [] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable_api');
      expect('resolution' in result[0]).toBe(false);
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });

    it('returns executable_api with resolution when integration is matched by exact name', async () => {
      const query = createMockApiQueryV3({ integrations: ['endpoint'] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable_api');
      if (result[0].kind !== 'executable_api') throw new Error('type guard');
      expect('resolution' in result[0]).toBe(true);
      const resolved = result[0] as { resolution: IntegrationResolution };
      expect(resolved.resolution.name).toBe('endpoint');
      expect(resolved.resolution.version).toBe('8.14.2');
      expect(resolved.resolution.indices).toEqual([]);
    });

    it('returns executable_api with resolution when integration is matched by regex', async () => {
      const query = createMockApiQueryV3({ integrations: ['end.*'] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable_api');
      if (result[0].kind !== 'executable_api') throw new Error('type guard');
      const resolved = result[0] as { resolution: IntegrationResolution };
      expect(resolved.resolution.name).toBe('endpoint');
    });

    it('does not match a substring — anchored regex prevents partial name matches', async () => {
      // "endpoint" unanchored would match "my-endpoint-extra"; anchored ^endpoint$ must not
      const query = createMockApiQueryV3({ integrations: ['endpoint'] });
      // replace installed packages with one whose name contains but is not equal to "endpoint"
      packageService.asInternalUser.getPackages.mockResolvedValue([
        { name: 'my-endpoint-extra', version: '1.0.0', status: 'installed', data_streams: [] },
      ]);
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('skipped');
      if (result[0].kind !== 'skipped') throw new Error('type guard');
      expect(result[0].reason).toBe('integration_not_installed');
    });

    it('skips invalid regex patterns without throwing and logs a warning', async () => {
      // an invalid pattern must not crash the batch — other valid patterns still resolve
      const mockLogger = createMockLogger();
      const localResolver = new IntegrationResolverImpl(
        packageService as unknown as PackageService,
        mockLogger
      );
      const query = createMockApiQueryV3({ integrations: ['[invalid', 'endpoint'] });
      const result = await localResolver.resolve([query]);
      expect(result).toHaveLength(1);
      // valid pattern "endpoint" still matches
      expect(result[0].kind).toBe('executable_api');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid regex pattern in integrations field: [invalid')
      );
    });

    it('a single invalid regex in integrations does not fail unrelated queries in the same batch', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v3bad = createMockApiQueryV3({ id: 'bad', integrations: ['[invalid'] });
      const results = await resolver.resolve([v1, v3bad]);
      // v1 must still succeed; bad pattern skips with integration_not_installed (all patterns dropped)
      expect(results).toHaveLength(2);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('skipped');
      if (results[1].kind !== 'skipped') throw new Error('type guard');
      expect(results[1].reason).toBe('integration_not_installed');
    });

    it('returns executable_api with the first matched integration when multiple patterns provided', async () => {
      const query = createMockApiQueryV3({ integrations: ['nonexistent', 'fleet_server'] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable_api');
      if (result[0].kind !== 'executable_api') throw new Error('type guard');
      const resolved = result[0] as { resolution: IntegrationResolution };
      expect(resolved.resolution.name).toBe('fleet_server');
    });

    it('returns skipped(integration_not_installed) when pattern matches nothing installed', async () => {
      const query = createMockApiQueryV3({ integrations: ['nonexistent'] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('skipped');
      if (result[0].kind !== 'skipped') throw new Error('type guard');
      expect(result[0].reason).toBe('integration_not_installed');
    });

    it('returns skipped(integration_not_installed) when package exists but is not installed', async () => {
      const query = createMockApiQueryV3({ integrations: ['system'] });
      const result = await resolver.resolve([query]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('skipped');
      if (result[0].kind !== 'skipped') throw new Error('type guard');
      expect(result[0].reason).toBe('integration_not_installed');
    });

    it('uses getPackages (not getInstallation) to resolve integrations', async () => {
      const query = createMockApiQueryV3({ integrations: ['endpoint'] });
      await resolver.resolve([query]);
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
      expect(packageService.asInternalUser.getInstallation).not.toHaveBeenCalled();
    });

    it('calls Fleet only once for multiple v3 API queries with integrations', async () => {
      const q1 = createMockApiQueryV3({ id: 'q1', integrations: ['endpoint'] });
      const q2 = createMockApiQueryV3({ id: 'q2', integrations: ['fleet_server'] });
      await resolver.resolve([q1, q2]);
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });

    it('calls Fleet only once when v2 and v3 API queries with integrations are mixed', async () => {
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const v3api = createMockApiQueryV3({ integrations: ['fleet_server'] });
      await resolver.resolve([v2, v3api]);
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });

    it('does not call Fleet when only v3 API queries without integrations are present', async () => {
      const q1 = createMockApiQueryV3({ id: 'q1', integrations: undefined });
      const q2 = createMockApiQueryV3({ id: 'q2', integrations: [] });
      await resolver.resolve([q1, q2]);
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });

    describe('Fleet unavailability', () => {
      beforeEach(() => {
        packageService.asInternalUser.getPackages.mockRejectedValue(new Error('Fleet is down'));
      });

      it('returns skipped(fleet_unavailable) when Fleet call fails', async () => {
        const query = createMockApiQueryV3({ integrations: ['endpoint'] });
        const result = await resolver.resolve([query]);
        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('skipped');
        if (result[0].kind !== 'skipped') throw new Error('type guard');
        expect(result[0].reason).toBe('fleet_unavailable');
      });

      it('still returns executable_api when v3 API query has no integrations and Fleet fails', async () => {
        const query = createMockApiQueryV3({ integrations: undefined });
        const result = await resolver.resolve([query]);
        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('executable_api');
      });
    });
  });

  describe('v3 index queries (DSL/EQL/ESQL at version 3)', () => {
    it('v3 DSL with integrations resolves identically to v2', async () => {
      const query = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const result = await resolver.resolve([{ ...query, version: 2 }]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable');
    });

    it('v3 DSL with direct index resolves without Fleet', async () => {
      const query = createMockQueryV2(QueryType.DSL, {
        integrations: undefined,
        index: 'logs-test-*',
      });
      const result = await resolver.resolve([{ ...query, version: 2 }]);
      expect(result).toHaveLength(1);
      expect(result[0].kind).toBe('executable');
      expect(packageService.asInternalUser.getPackages).not.toHaveBeenCalled();
    });
  });

  describe('mixed queries', () => {
    it('handles v1, v2 (integrations), v2 (index), v3 API (no integrations) together', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v2int = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const v2idx = createMockQueryV2(QueryType.DSL, {
        integrations: undefined,
        index: 'logs-test-*',
      });
      const v3api = createMockApiQueryV3({ integrations: undefined });

      const results = await resolver.resolve([v1, v2int, v2idx, v3api]);

      expect(results).toHaveLength(4);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('executable');
      expect(results[2].kind).toBe('executable');
      expect(results[3].kind).toBe('executable_api');
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });

    it('handles v1, v2 (integrations), v3 API (integrations), unknown together', async () => {
      const v1 = createMockQueryV1(QueryType.DSL);
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const v3api = createMockApiQueryV3({ integrations: ['fleet_server'] });
      const unknown = { version: 99, id: 'x', name: 'x', _raw: {} };

      const results = await resolver.resolve([v1, v2, v3api, unknown]);

      expect(results).toHaveLength(4);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('executable');
      expect(results[2].kind).toBe('executable_api');
      expect(results[3].kind).toBe('skipped');
      expect(packageService.asInternalUser.getPackages).toHaveBeenCalledTimes(1);
    });

    it('expands v2 with two matched integrations to two ExecutableQueries', async () => {
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint', 'fleet_server'] });
      const results = await resolver.resolve([v2]);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.kind === 'executable')).toBe(true);
    });

    it('skips v3 API (integrations) and v2 (integrations) when Fleet is down; v1 and v3 API (no integrations) still run', async () => {
      packageService.asInternalUser.getPackages.mockRejectedValue(new Error('Fleet is down'));

      const v1 = createMockQueryV1(QueryType.DSL);
      const v2 = createMockQueryV2(QueryType.DSL, { integrations: ['endpoint'] });
      const v3apiNoInt = createMockApiQueryV3({ id: 'v3-no-int', integrations: undefined });
      const v3apiWithInt = createMockApiQueryV3({
        id: 'v3-with-int',
        integrations: ['fleet_server'],
      });

      const results = await resolver.resolve([v1, v2, v3apiNoInt, v3apiWithInt]);

      expect(results).toHaveLength(4);
      expect(results[0].kind).toBe('executable');
      expect(results[1].kind).toBe('skipped');
      if (results[1].kind === 'skipped') expect(results[1].reason).toBe('fleet_unavailable');
      expect(results[2].kind).toBe('executable_api');
      expect(results[3].kind).toBe('skipped');
      if (results[3].kind === 'skipped') expect(results[3].reason).toBe('fleet_unavailable');
    });
  });
});
