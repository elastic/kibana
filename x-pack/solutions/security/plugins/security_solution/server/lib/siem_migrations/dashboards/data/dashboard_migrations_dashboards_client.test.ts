/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DashboardMigrationsDataDashboardsClient } from './dashboard_migrations_dashboards_client';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type { SplunkOriginalDashboardExport } from '../../../../../common/siem_migrations/model/vendor/dashboards/splunk.gen';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { DashboardMigrationsClientDependencies } from '../types';

const INDEX_NAME = '.kibana-siem-dashboard-migrations-dashboards';

const getSampleSplunkDashboard: () => SplunkOriginalDashboardExport = () => ({
  result: {
    id: uuidv4(),
    label: `Some Dashboard Id`,
    title: '_admin',
    'eai:data':
      '<dashboard><label>Some Dashboard Id</label><description>Some description</description></dashboard>',
    'eai:acl.app': 'system',
    'eai:acl.sharing': 'system',
    'eai:acl.owner': 'nobody',
    updated: '1970-01-01T00:00:00+00:00',
  },
});

describe('Dashboard Migrations Dashboards client', () => {
  let dashboardMigrationDataDashboardsClient: DashboardMigrationsDataDashboardsClient;

  const sampleMigrationId = uuidv4();
  const esClientMock =
    elasticsearchServiceMock.createCustomClusterClient() as unknown as jest.MockedObjectDeep<IScopedClusterClient>;
  const logger = loggingSystemMock.createLogger();
  const indexNameProvider = jest.fn().mockResolvedValue(INDEX_NAME);
  const currentUser = {
    username: 'testUser',
    profile_uid: 'testProfileUid',
  } as unknown as AuthenticatedUser;

  const dependencies = {} as unknown as DashboardMigrationsClientDependencies;

  beforeEach(() => {
    dashboardMigrationDataDashboardsClient = new DashboardMigrationsDataDashboardsClient(
      indexNameProvider,
      currentUser,
      esClientMock,
      logger,
      dependencies
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a dashboard with the correct parameters', async () => {
      const sampleDashboard = getSampleSplunkDashboard();
      await dashboardMigrationDataDashboardsClient.create(sampleMigrationId, [sampleDashboard]);

      expect(esClientMock.asInternalUser.bulk).toHaveBeenCalledWith({
        refresh: 'wait_for',
        operations: [
          { create: { _index: INDEX_NAME } },
          {
            migration_id: sampleMigrationId,
            '@timestamp': expect.any(String),
            status: 'pending',
            created_by: currentUser.profile_uid,
            updated_by: currentUser.profile_uid,
            updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
            original_dashboard: {
              id: sampleDashboard.result.id,
              title: sampleDashboard.result.label,
              data: sampleDashboard.result['eai:data'],
              description: '',
              format: 'xml',
              vendor: 'splunk',
              last_updated: sampleDashboard.result.updated,
              splunk_properties: {
                app: sampleDashboard.result['eai:acl.app'],
                sharing: sampleDashboard.result['eai:acl.sharing'],
                owner: sampleDashboard.result['eai:acl.owner'],
              },
            },
          },
        ],
      });
    });

    it('should handle batching correctly', async () => {
      const listOfSplunkDashbaords = Array.from({ length: 501 }, () => getSampleSplunkDashboard());
      await dashboardMigrationDataDashboardsClient.create(
        sampleMigrationId,
        listOfSplunkDashbaords
      );

      expect(esClientMock.asInternalUser.bulk).toHaveBeenCalledTimes(2);
      expect(esClientMock.asInternalUser.bulk.mock.calls[0][0].operations).not.toBeUndefined();
      expect(esClientMock.asInternalUser.bulk.mock.calls[0][0].operations?.length).toBe(1000);
      expect(esClientMock.asInternalUser.bulk.mock.calls[1][0].operations?.length).toBe(2);
    });

    describe('errors', () => {
      it('should handle errors during creation', async () => {
        esClientMock.asInternalUser.bulk.mockRejectedValue(new Error('Indexing error'));

        await expect(
          dashboardMigrationDataDashboardsClient.create(sampleMigrationId, [
            getSampleSplunkDashboard(),
          ])
        ).rejects.toThrow('Indexing error');
      });
    });
  });

  describe('getStats', () => {
    it('should call stats with correct params', async () => {
      esClientMock.asInternalUser.search.mockResolvedValue({
        aggregations: {
          status: {
            buckets: [{ key: 'pending', doc_count: 5 }],
          },
          createdAt: { value: 1622548800000 }, // Example timestamp
          lastUpdatedAt: { value: 1622635200000 }, // Example timestamp
        },
        hits: { total: 0 },
      } as unknown as SearchResponse);
      await dashboardMigrationDataDashboardsClient.getStats(sampleMigrationId);

      expect(esClientMock.asInternalUser.search).toHaveBeenCalledWith({
        _source: false,
        index: INDEX_NAME,
        query: {
          bool: {
            filter: { term: { migration_id: sampleMigrationId } },
          },
        },
        aggregations: {
          status: { terms: { field: 'status' } },
          createdAt: { min: { field: '@timestamp' } },
          lastUpdatedAt: { max: { field: 'updated_at' } },
        },
      });
    });

    it('should process returned stats correctly', async () => {
      esClientMock.asInternalUser.search.mockResolvedValue({
        aggregations: {
          status: {
            buckets: [{ key: 'pending', doc_count: 3 }],
          },
          createdAt: { value_as_string: 1622548800000 }, // Example timestamp
          lastUpdatedAt: { value_as_string: 1622635200000 }, // Example timestamp
        },
        hits: { total: 4 },
      } as unknown as SearchResponse);

      const stats = await dashboardMigrationDataDashboardsClient.getStats(sampleMigrationId);

      expect(stats).toEqual({
        id: sampleMigrationId,
        dashboards: { pending: 3, processing: 0, completed: 0, failed: 0, total: 4 },
        created_at: 1622548800000,
        last_updated_at: 1622635200000,
        status: 'ready',
      });
    });

    describe('errors', () => {
      it('should handle errors during stats retrieval', async () => {
        const error = 'Stats error';
        esClientMock.asInternalUser.search.mockRejectedValue(new Error(error));

        await expect(
          dashboardMigrationDataDashboardsClient.getStats(sampleMigrationId)
        ).rejects.toThrow(error);
        expect(logger.error).toHaveBeenCalledWith(
          `Error getting dashboard migration stats: ${error}`
        );
      });
    });
  });
});
