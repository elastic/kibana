/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { DashboardMigrationTaskRunner } from './dashboard_migrations_task_runner';

const mockGetResources = jest.fn().mockResolvedValue({});
jest.mock('./retrievers', () => ({
  ...jest.requireActual('./retrievers'),
  DashboardMigrationsRetriever: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    resources: {
      getResources: mockGetResources,
    },
  })),
}));

const mockLogger = loggerMock.create();
const inferenceService = inferenceMock.createStartContract();
const mockDependencies: jest.Mocked<SiemMigrationsClientDependencies> = {
  rulesClient: {},
  savedObjectsClient: {},
  inferenceService,
  actionsClient: {},
  telemetry: {},
} as unknown as SiemMigrationsClientDependencies;
const mockRequest = {} as unknown as KibanaRequest;
const mockUser = {} as unknown as AuthenticatedUser;

describe('DashboardMigrationTaskRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetResources.mockResolvedValue({});
  });

  describe('prepareTaskInput', () => {
    it('should enrich relevant lookup resources with runtime mapping fields', async () => {
      const getMapping = jest.fn().mockResolvedValue({
        lookup_default_panel_lookup: {
          mappings: {
            runtime: {
              host: { type: 'keyword' },
              ip: { type: 'ip' },
            },
          },
        },
      });
      const dataClient = {
        resources: { getMapping },
      };
      const taskRunner = new DashboardMigrationTaskRunner(
        'test-migration-id',
        'splunk',
        mockRequest,
        mockUser,
        new AbortController(),
        dataClient as never,
        mockLogger,
        mockDependencies
      );
      const migrationDashboard = {
        id: 'dashboard-1',
        original_dashboard: { vendor: 'splunk' },
      };
      const resources = {
        lookup: [{ type: 'lookup', name: 'panel_lookup', content: 'lookup_default_panel_lookup' }],
      };
      mockGetResources.mockResolvedValue(resources);

      await expect(
        // @ts-expect-error checking protected method
        taskRunner.prepareTaskInput(migrationDashboard)
      ).resolves.toEqual({
        id: 'dashboard-1',
        original_dashboard: { vendor: 'splunk' },
        resources: {
          lookup: [
            {
              type: 'lookup',
              name: 'panel_lookup',
              content: 'lookup_default_panel_lookup',
              fields: [
                { path: 'host', type: 'keyword' },
                { path: 'ip', type: 'ip' },
              ],
            },
          ],
        },
      });
      expect(mockGetResources).toHaveBeenCalledWith(migrationDashboard.original_dashboard);
      expect(getMapping).toHaveBeenCalledWith({
        index: ['lookup_default_panel_lookup'],
        allow_no_indices: true,
        ignore_unavailable: true,
      });
    });
  });
});
