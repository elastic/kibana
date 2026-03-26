/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { SecurityCatalogService } from './security_catalog_service';

jest.mock('@kbn/data-source-catalog', () => ({
  refreshCatalog: jest.fn().mockResolvedValue({ entriesCount: 5, durationMs: 100 }),
  DEFAULT_SECURITY_PATTERNS: ['logs-*'],
  CatalogQuery: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({ entries: [], total: 0 }),
  })),
}));

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
    });
  });

  it('exposes a query interface', async () => {
    const service = new SecurityCatalogService(logger);
    await service.start({ esClient });

    const query = service.getQuery(esClient);
    expect(query).toBeDefined();
    expect(typeof query.search).toBe('function');
  });
});
