/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CatalogIntegrationEnricher } from './catalog_integration_enricher';
import type { RuleMigrationIntegration } from '../../types';

jest.mock('@kbn/data-source-catalog', () => ({
  CatalogQuery: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      entries: [
        {
          name: 'logs-endpoint.events.process-default',
          type: 'data_stream',
          mapping: {
            fields: [],
            total_field_count: 150,
            ecs_field_count: 120,
            ecs_field_coverage: 0.8,
          },
          stats: {
            doc_count: 50000,
            size_bytes: 1024000,
            last_ingested_at: '2026-03-28T00:00:00Z',
            is_active: true,
            freshness_category: 'live',
          },
          semantic: { summary: '', topics: ['process execution', 'endpoint security'] },
          id: 'logs-endpoint.events.process-default',
          catalog_version: 1,
          refreshed_at: '2026-03-28T00:00:00Z',
        },
      ],
      total: 1,
    }),
  })),
}));

describe('CatalogIntegrationEnricher', () => {
  const mockEsClient = {} as ElasticsearchClient;

  it('enriches integrations with catalog metadata', async () => {
    const enricher = new CatalogIntegrationEnricher(mockEsClient);
    const integrations: RuleMigrationIntegration[] = [
      {
        id: 'endpoint',
        title: 'Elastic Defend',
        description: 'Endpoint security',
        data_streams: [
          {
            dataset: 'endpoint.events.process',
            title: 'Process Events',
            index_pattern: 'logs-endpoint.events.process-*',
          },
        ],
        elser_embedding: 'Elastic Defend endpoint security',
        fields_metadata: undefined,
      },
    ];

    const result = await enricher.enrichIntegrations(integrations);

    expect(result).toContain('Elastic Defend');
    expect(result).toContain('50,000 docs');
    expect(result).toContain('80% coverage');
    expect(result).toContain('process execution');
    expect(result).toContain('endpoint security');
    expect(result).toContain('Data source catalog context');
  });

  it('returns empty string for no integrations', async () => {
    const enricher = new CatalogIntegrationEnricher(mockEsClient);
    const result = await enricher.enrichIntegrations([]);
    expect(result).toBe('');
  });

  it('gracefully handles catalog errors', async () => {
    const { CatalogQuery } = jest.requireMock('@kbn/data-source-catalog');
    CatalogQuery.mockImplementation(() => ({
      search: jest.fn().mockRejectedValue(new Error('index_not_found')),
    }));

    const enricher = new CatalogIntegrationEnricher(mockEsClient);
    const integrations: RuleMigrationIntegration[] = [
      {
        id: 'endpoint',
        title: 'Elastic Defend',
        description: 'Endpoint security',
        data_streams: [],
        elser_embedding: 'test',
        fields_metadata: undefined,
      },
    ];

    const result = await enricher.enrichIntegrations(integrations);
    expect(result).toBe('');
  });

  it('handles entries without stats or semantic fields', async () => {
    const { CatalogQuery } = jest.requireMock('@kbn/data-source-catalog');
    CatalogQuery.mockImplementation(() => ({
      search: jest.fn().mockResolvedValue({
        entries: [
          {
            name: 'logs-okta.system-default',
            type: 'data_stream',
            mapping: {
              fields: [],
              total_field_count: 80,
              ecs_field_count: 40,
              ecs_field_coverage: 0.5,
            },
            id: 'logs-okta.system-default',
            catalog_version: 1,
            refreshed_at: '2026-03-28T00:00:00Z',
          },
        ],
        total: 1,
      }),
    }));

    const enricher = new CatalogIntegrationEnricher(mockEsClient);
    const integrations: RuleMigrationIntegration[] = [
      {
        id: 'okta',
        title: 'Okta',
        description: 'Okta identity provider',
        data_streams: [],
        elser_embedding: 'test',
        fields_metadata: undefined,
      },
    ];

    const result = await enricher.enrichIntegrations(integrations);
    expect(result).toContain('Okta');
    expect(result).toContain('40 ECS fields');
    expect(result).toContain('50% coverage');
    expect(result).not.toContain('topics');
  });
});
