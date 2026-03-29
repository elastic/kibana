/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SecurityCatalogService } from './security_catalog_service';

jest.mock('@kbn/data-source-catalog', () => ({
  refreshCatalog: jest.fn().mockResolvedValue({ entriesCount: 5, durationMs: 100 }),
  DEFAULT_SECURITY_PATTERNS: ['logs-*'],
  CatalogQuery: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
  })),
}));

const mockTaskManagerSetup = {
  registerTaskDefinitions: jest.fn(),
} as unknown as TaskManagerSetupContract;

const mockTaskManagerStart = {
  ensureScheduled: jest.fn().mockResolvedValue(undefined),
} as unknown as TaskManagerStartContract;

describe('SecurityCatalogService', () => {
  const logger = loggingSystemMock.createLogger();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an instance', () => {
    const service = new SecurityCatalogService(logger);
    expect(service).toBeInstanceOf(SecurityCatalogService);
  });

  it('runs initial refresh on start', async () => {
    const { refreshCatalog } = jest.requireMock('@kbn/data-source-catalog');

    const service = new SecurityCatalogService(logger);
    await service.start({ esClient });

    expect(refreshCatalog).toHaveBeenCalledTimes(1);
    expect(refreshCatalog).toHaveBeenCalledWith({
      esClient,
      packageClient: undefined,
      patterns: ['logs-*'],
      includeStats: true,
    });
  });

  it('exposes a query interface', async () => {
    const service = new SecurityCatalogService(logger);
    await service.start({ esClient });

    const query = service.getQuery(esClient);
    expect(query).toBeDefined();
    expect(typeof query.search).toBe('function');
  });

  it('setup() registers task definitions', () => {
    const service = new SecurityCatalogService(logger);
    service.setup(mockTaskManagerSetup);

    expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(mockTaskManagerSetup.registerTaskDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({
        'security:data-source-catalog:refresh-stats': expect.objectContaining({
          title: 'Security Data Source Catalog Stats Refresh',
          timeout: '5m',
          createTaskRunner: expect.any(Function),
        }),
      })
    );
  });

  it('scheduleRefresh() schedules the task with default interval', async () => {
    const service = new SecurityCatalogService(logger);
    await service.scheduleRefresh(mockTaskManagerStart);

    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledTimes(1);
    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'security:data-source-catalog:refresh-stats:1.0.0',
        taskType: 'security:data-source-catalog:refresh-stats',
        scope: ['securitySolution'],
        schedule: { interval: '6h' },
      })
    );
  });

  it('scheduleRefresh() uses custom interval when provided via start()', async () => {
    const service = new SecurityCatalogService(logger);
    await service.start({ esClient, refreshInterval: '1h' });
    await service.scheduleRefresh(mockTaskManagerStart);

    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { interval: '1h' },
      })
    );
  });

  it('scheduleRefresh() keeps default interval when refreshInterval is not provided', async () => {
    const service = new SecurityCatalogService(logger);
    await service.start({ esClient });
    await service.scheduleRefresh(mockTaskManagerStart);

    expect(mockTaskManagerStart.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { interval: '6h' },
      })
    );
  });
});
