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
  catalogDataSources: [],
  suggestedRequiredFields: [],
  suggestedRelatedIntegrations: [],
  rule: {},
  errors: [],
  warnings: [],
});

const mockEntry = {
  id: 'test-1',
  name: 'logs-endpoint.events.process-default',
  type: 'data_stream' as const,
  mapping: {
    fields: [
      { name: 'process.name', type: 'keyword', ecs: true, searchable: true, aggregatable: true },
      { name: 'process.pid', type: 'long', ecs: true, searchable: true, aggregatable: true },
      { name: 'non_ecs_field', type: 'keyword', ecs: false, searchable: true, aggregatable: true },
    ],
    total_field_count: 3,
    ecs_field_count: 2,
    ecs_field_coverage: 0.67,
  },
  integration: {
    package_name: 'endpoint',
    package_title: 'Elastic Endpoint',
    package_version: '8.0.0',
    integration_name: 'endpoint',
    dataset: 'endpoint.events.process',
    description: 'Elastic Endpoint integration',
    data_stream_title: 'Process events',
  },
  catalog_version: 1,
  refreshed_at: '2024-01-01T00:00:00Z',
};

describe('getDiscoverDataSourcesNode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns catalogContext from catalog query', async () => {
    mockSearch.mockResolvedValue({
      entries: [mockEntry],
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

  it('pre-populates suggestedRequiredFields with ECS fields from catalog entries', async () => {
    mockSearch.mockResolvedValue({ entries: [mockEntry], total: 1 });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('## Available Data Sources');

    const node = getDiscoverDataSourcesNode({ esClient: mockEsClient, logger: mockLogger });
    const result = await node(createState('detect powershell execution'));

    expect(result.suggestedRequiredFields).toEqual([
      { name: 'process.name', type: 'keyword', ecs: true },
      { name: 'process.pid', type: 'long', ecs: true },
    ]);
    // non-ECS field must not appear
    expect(result.suggestedRequiredFields).not.toContainEqual(
      expect.objectContaining({ name: 'non_ecs_field' })
    );
  });

  it('pre-populates suggestedRelatedIntegrations from catalog entries', async () => {
    mockSearch.mockResolvedValue({ entries: [mockEntry], total: 1 });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('## Available Data Sources');

    const node = getDiscoverDataSourcesNode({ esClient: mockEsClient, logger: mockLogger });
    const result = await node(createState('detect powershell execution'));

    expect(result.suggestedRelatedIntegrations).toEqual([
      { package: 'endpoint', version: '8.0.0', integration: 'endpoint' },
    ]);
  });

  it('deduplicates suggestedRelatedIntegrations by package name', async () => {
    const secondEntry = {
      ...mockEntry,
      id: 'test-2',
      name: 'logs-endpoint.events.network-default',
      integration: { ...mockEntry.integration, integration_name: 'network' },
    };
    mockSearch.mockResolvedValue({ entries: [mockEntry, secondEntry], total: 2 });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('## Available Data Sources');

    const node = getDiscoverDataSourcesNode({ esClient: mockEsClient, logger: mockLogger });
    const result = await node(createState('detect lateral movement'));

    // same package_name 'endpoint' — only first entry survives dedup
    expect(result.suggestedRelatedIntegrations).toHaveLength(1);
    expect(result.suggestedRelatedIntegrations![0].package).toBe('endpoint');
  });

  it('returns empty suggested fields and integrations when no entries found', async () => {
    mockSearch.mockResolvedValue({ entries: [], total: 0 });
    (formatCatalogContextForPrompt as jest.Mock).mockReturnValue('');

    const node = getDiscoverDataSourcesNode({ esClient: mockEsClient, logger: mockLogger });
    const result = await node(createState('detect powershell'));

    expect(result.suggestedRequiredFields).toEqual([]);
    expect(result.suggestedRelatedIntegrations).toEqual([]);
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
    expect(result.catalogDataSources).toEqual([]);
  });

  it('returns empty arrays on error', async () => {
    mockSearch.mockRejectedValue(new Error('index_not_found_exception'));

    const node = getDiscoverDataSourcesNode({
      esClient: mockEsClient,
      logger: mockLogger,
    });
    const result = await node(createState('detect powershell'));

    expect(result.catalogContext).toBe('');
    expect(result.catalogDataSources).toEqual([]);
    expect(result.suggestedRequiredFields).toEqual([]);
    expect(result.suggestedRelatedIntegrations).toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to query data source catalog')
    );
  });

  it('reports progress via events', async () => {
    mockSearch.mockResolvedValue({
      entries: [mockEntry],
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
