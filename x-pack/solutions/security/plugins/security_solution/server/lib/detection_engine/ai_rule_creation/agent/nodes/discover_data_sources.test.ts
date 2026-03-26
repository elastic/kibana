/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getDiscoverDataSourcesNode } from './discover_data_sources';

const mockSearch = jest.fn();

jest.mock('@kbn/data-source-catalog', () => ({
  CatalogQuery: jest.fn().mockImplementation(() => ({
    search: mockSearch,
  })),
}));

jest.mock('../../../../data_source_catalog/catalog_tools/format_catalog_context', () => ({
  formatCatalogContextForPrompt: jest.fn().mockReturnValue(''),
}));

const { formatCatalogContextForPrompt } = jest.requireMock(
  '../../../../data_source_catalog/catalog_tools/format_catalog_context'
);

const mockLogger = loggerMock.create();
const mockEsClient = {} as ElasticsearchClient;

const createState = (userQuery: string) => ({
  userQuery,
  catalogContext: '',
  rule: {},
  errors: [],
  warnings: [],
});

describe('getDiscoverDataSourcesNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns catalogContext from catalog query', async () => {
    mockSearch.mockResolvedValue({
      entries: [{ name: 'logs-endpoint.events.process-default' }],
      total: 1,
    });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue(
      '## Available Data Sources\n\nThe following Elasticsearch data sources are available:\n\n- **logs-endpoint.events.process-default** (datastream)'
    );

    const node = getDiscoverDataSourcesNode({
      esClient: mockEsClient,
      logger: mockLogger,
    });
    const result = await node(createState('detect powershell execution'));

    expect(result.catalogContext).toContain('Available Data Sources');
    expect(mockSearch).toHaveBeenCalledWith({
      searchText: 'detect powershell execution',
      activeOnly: true,
      size: 10,
    });
  });

  it('returns empty context when no entries found', async () => {
    mockSearch.mockResolvedValue({ entries: [], total: 0 });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('');

    const node = getDiscoverDataSourcesNode({
      esClient: mockEsClient,
      logger: mockLogger,
    });
    const result = await node(createState('detect powershell'));

    expect(result.catalogContext).toBe('');
  });

  it('returns empty context on error', async () => {
    mockSearch.mockRejectedValue(new Error('index_not_found_exception'));

    const node = getDiscoverDataSourcesNode({
      esClient: mockEsClient,
      logger: mockLogger,
    });
    const result = await node(createState('detect powershell'));

    expect(result.catalogContext).toBe('');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to query data source catalog')
    );
  });

  it('reports progress via events', async () => {
    mockSearch.mockResolvedValue({
      entries: [{ name: 'test-index' }],
      total: 1,
    });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('## Available Data Sources');

    const mockEvents = {
      reportProgress: jest.fn(),
      sendUiEvent: jest.fn(),
    };

    const node = getDiscoverDataSourcesNode({
      esClient: mockEsClient,
      logger: mockLogger,
      events: mockEvents,
    });
    await node(createState('detect lateral movement'));

    expect(mockEvents.reportProgress).toHaveBeenCalledWith('Discovering available data sources...');
    expect(mockEvents.reportProgress).toHaveBeenCalledWith(
      'Found 1 relevant data source(s) for query context'
    );
  });
});
