/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RuleMigrationsDataIntegrationsClient } from './rule_migrations_data_integrations_client';
import type {
  ElasticsearchClient,
  IScopedClusterClient,
  AuthenticatedUser,
} from '@kbn/core/server';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { RuleMigrationIntegration } from '../types';
import type { PackageList, PackageListItem, RegistryDataStream } from '@kbn/fleet-plugin/common';
import type { SearchHit, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { packageServiceMock } from '@kbn/fleet-plugin/server/services/epm/package_service.mock';
import { loggerMock } from '@kbn/logging-mocks';

const createMockPackage = (overrides: Partial<PackageListItem> = {}): PackageListItem =>
  ({
    name: 'mock-package',
    title: 'Mock Package',
    version: '1.0.0',
    description: 'Mock Description',
    data_streams: [
      {
        type: 'logs',
        dataset: 'mock.dataset',
        title: 'Mock Logs',
      } as RegistryDataStream,
    ],
    ...overrides,
  } as PackageListItem);

describe('RuleMigrationsDataIntegrationsClient', () => {
  const getIndexName = jest.fn().mockResolvedValue('mock-index');
  const currentUser = { username: 'elastic' } as AuthenticatedUser;
  const logger = loggerMock.create();

  const esClientMock = {
    bulk: jest.fn(),
    search: jest.fn(),
  } as unknown as ElasticsearchClient;

  const esScopedClientMock: IScopedClusterClient = {
    asInternalUser: esClientMock,
  } as unknown as IScopedClusterClient;

  const mockPackageService = packageServiceMock.create();
  const mockGetPackages = mockPackageService.asInternalUser.getPackages;
  const dependencies = {
    packageService: mockPackageService,
  } as unknown as SiemMigrationsClientDependencies;

  let client: RuleMigrationsDataIntegrationsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new RuleMigrationsDataIntegrationsClient(
      getIndexName,
      currentUser,
      esScopedClientMock,
      logger,
      dependencies
    );
  });

  describe('getSecurityLogsPackages', () => {
    it('should return only packages with logs data_streams', async () => {
      const packages: PackageList = [
        createMockPackage(),
        createMockPackage({
          data_streams: [
            { type: 'metrics', dataset: 'metrics.dataset', title: 'Metrics' } as RegistryDataStream,
          ],
        }),
      ];
      mockGetPackages.mockResolvedValue(packages);

      const result = await client.getSecurityLogsPackages();

      expect(result).toHaveLength(1);
      expect(result?.[0].name).toBe('mock-package');
      expect(mockGetPackages).toHaveBeenCalledWith({ prerelease: true, category: 'security' });
    });

    it('should return undefined if packageService is not available', async () => {
      const brokenClient = new RuleMigrationsDataIntegrationsClient(
        getIndexName,
        currentUser,
        esScopedClientMock,
        logger,
        { packageService: undefined } as unknown as SiemMigrationsClientDependencies
      );

      const result = await brokenClient.getSecurityLogsPackages();
      expect(result).toBeUndefined();
    });
  });

  describe('populate', () => {
    it('should index integrations with at least on logs data stream', async () => {
      mockGetPackages.mockResolvedValue([
        createMockPackage({
          data_streams: [
            { type: 'metrics', dataset: 'metrics.dataset', title: 'Metrics' } as RegistryDataStream,
          ],
        }),
      ]);
      esClientMock.bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });

      await client.populate();

      expect(esClientMock.bulk).not.toHaveBeenCalled();
    });

    it('should only index logs data streams', async () => {
      mockGetPackages.mockResolvedValue([
        createMockPackage({
          data_streams: [
            { type: 'logs', dataset: 'logs.dataset', title: 'Logs' } as RegistryDataStream,
            { type: 'metrics', dataset: 'metrics.dataset', title: 'Metrics' } as RegistryDataStream,
          ],
        }),
      ]);
      esClientMock.bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });

      await client.populate();

      expect(esClientMock.bulk).toHaveBeenCalledWith(
        {
          refresh: 'wait_for',
          operations: [
            // only the logs data stream operation should be included
            expect.objectContaining({ update: expect.any(Object) }),
            expect.objectContaining({
              doc: expect.objectContaining({
                data_streams: [
                  { dataset: 'logs.dataset', index_pattern: 'logs-logs.dataset-*', title: 'Logs' },
                ],
              }),
              doc_as_upsert: true,
            }),
          ],
        },
        { requestTimeout: 600000 }
      );
    });

    it('should call bulk with transformed logs packages', async () => {
      mockGetPackages.mockResolvedValue([createMockPackage()]);
      esClientMock.bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });

      await client.populate();

      expect(esClientMock.bulk).toHaveBeenCalledWith(
        {
          refresh: 'wait_for',
          operations: expect.arrayContaining([
            expect.objectContaining({ update: expect.any(Object) }),
            expect.objectContaining({ doc: expect.any(Object), doc_as_upsert: true }),
          ]),
        },
        { requestTimeout: 600000 }
      );
    });

    it('should log warning when package service is unavailable', async () => {
      const noPackageClient = new RuleMigrationsDataIntegrationsClient(
        getIndexName,
        currentUser,
        esScopedClientMock,
        logger,
        { packageService: undefined } as unknown as SiemMigrationsClientDependencies
      );

      await noPackageClient.populate();

      expect(logger.warn).toHaveBeenCalledWith(
        'Package service not available, not able not populate integrations index'
      );
    });

    it('should throw and log on bulk error', async () => {
      mockGetPackages.mockResolvedValue([createMockPackage()]);
      esClientMock.bulk = jest.fn().mockResolvedValue({
        errors: true,
        items: [{ update: { error: { reason: 'test error' } } }],
      });

      await expect(client.populate()).rejects.toThrow('test error');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('test error'));
    });
  });

  describe('semanticSearch', () => {
    it('should return filtered integration results from search', async () => {
      const mockHits = [
        {
          _id: '1',
          _source: {
            title: 'Integration 1',
            description: 'Description 1',
            id: '1',
            data_streams: [{ title: 'Logs 1', dataset: 'ds1', index_pattern: 'logs-ds1-*' }],
          },
        },
      ] as Array<SearchHit<RuleMigrationIntegration>>;

      const mockResponse: SearchResponse<RuleMigrationIntegration> = {
        hits: {
          hits: mockHits,
          total: 2,
          max_score: 1.0,
        },
        took: 10,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      };

      esClientMock.search = jest.fn().mockResolvedValue(mockResponse);

      const query = 'test query';

      const results = await client.semanticSearch(query);

      expect(esClientMock.search).toHaveBeenCalledWith({
        index: 'mock-index',
        query: {
          function_score: {
            query: {
              bool: {
                must: { semantic: { query, field: 'elser_embedding' } },
                must_not: { ids: { values: ['splunk', 'elastic_security', 'ibm_qradar'] } },
                filter: { exists: { field: 'data_streams' } },
              },
            },
            functions: expect.any(Array),
            score_mode: 'multiply' as const,
            boost_mode: 'multiply' as const,
          },
        },
        size: 5,
        min_score: 7,
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Integration 1');
    });

    it('should throw and log on search error', async () => {
      const error = new Error('Search failed');
      esClientMock.search = jest.fn().mockRejectedValue(error);

      await expect(client.semanticSearch('test')).rejects.toThrow('Search failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error querying integration details for ELSER: Search failed'
      );
    });
  });
});
