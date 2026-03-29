/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { validateRequiredFields } from './validate_required_fields';

const mockSearch = jest.fn();

jest.mock('@kbn/data-source-catalog', () => ({
  CatalogQuery: jest.fn().mockImplementation(() => ({
    search: mockSearch,
  })),
}));

describe('validateRequiredFields', () => {
  const esClient = {} as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({
      entries: [{ name: 'logs-endpoint.events.process-default' }],
      total: 1,
    });
  });

  it('returns exists: true for fields found in catalog', async () => {
    const results = await validateRequiredFields(
      esClient,
      ['logs-endpoint*'],
      [{ name: 'process.name', type: 'keyword', ecs: true }]
    );

    expect(results).toHaveLength(1);
    expect(results[0].exists).toBe(true);
    expect(results[0].matchedIndices).toContain('logs-endpoint.events.process-default');
  });

  it('passes the correct query parameters to CatalogQuery', async () => {
    await validateRequiredFields(
      esClient,
      ['logs-endpoint*'],
      [{ name: 'process.name', type: 'keyword' }]
    );

    expect(mockSearch).toHaveBeenCalledWith({
      namePattern: 'logs-endpoint*',
      hasFields: ['process.name'],
      size: 5,
    });
  });

  it('returns exists: false for missing fields', async () => {
    mockSearch.mockResolvedValue({ entries: [], total: 0 });

    const results = await validateRequiredFields(
      esClient,
      ['logs-endpoint*'],
      [{ name: 'nonexistent.field', type: 'keyword' }]
    );

    expect(results).toHaveLength(1);
    expect(results[0].exists).toBe(false);
    expect(results[0].matchedIndices).toEqual([]);
  });

  it('validates multiple fields independently', async () => {
    mockSearch
      .mockResolvedValueOnce({
        entries: [{ name: 'logs-endpoint.events.process-default' }],
        total: 1,
      })
      .mockResolvedValueOnce({ entries: [], total: 0 });

    const results = await validateRequiredFields(
      esClient,
      ['logs-endpoint*'],
      [
        { name: 'process.name', type: 'keyword', ecs: true },
        { name: 'nonexistent.field', type: 'keyword' },
      ]
    );

    expect(results).toHaveLength(2);
    expect(results[0].exists).toBe(true);
    expect(results[1].exists).toBe(false);
  });

  it('returns empty array when requiredFields is empty', async () => {
    const results = await validateRequiredFields(esClient, ['logs-*'], []);

    expect(results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns empty array when indexPatterns is empty', async () => {
    const results = await validateRequiredFields(
      esClient,
      [],
      [{ name: 'process.name', type: 'keyword' }]
    );

    expect(results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('preserves the original field object in results', async () => {
    const field = { name: 'process.name', type: 'keyword', ecs: true };
    const results = await validateRequiredFields(esClient, ['logs-*'], [field]);

    expect(results[0].field).toBe(field);
  });
});
