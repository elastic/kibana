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

const mockEntry = {
  name: 'logs-endpoint.events.process-default',
  mapping: {
    fields: [
      { name: 'process.name', type: 'keyword' },
      { name: 'process.pid', type: 'long' },
    ],
  },
};

describe('validateRequiredFields', () => {
  const esClient = {} as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearch.mockResolvedValue({
      entries: [mockEntry],
      total: 1,
    });
  });

  it('returns exists: true for fields found in catalog', async () => {
    const results = await validateRequiredFields(
      esClient,
      'logs-endpoint*',
      [{ name: 'process.name', type: 'keyword', ecs: true }]
    );

    expect(results).toHaveLength(1);
    expect(results[0].exists).toBe(true);
    expect(results[0].matchedIndices).toContain('logs-endpoint.events.process-default');
  });

  it('issues a single batch query for all fields', async () => {
    await validateRequiredFields(esClient, 'logs-endpoint*', [
      { name: 'process.name', type: 'keyword' },
      { name: 'process.pid', type: 'long' },
    ]);

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith({
      namePattern: 'logs-endpoint*',
      size: 50,
    });
  });

  it('returns exists: false for missing fields', async () => {
    const results = await validateRequiredFields(
      esClient,
      'logs-endpoint*',
      [{ name: 'nonexistent.field', type: 'keyword' }]
    );

    expect(results).toHaveLength(1);
    expect(results[0].exists).toBe(false);
    expect(results[0].matchedIndices).toEqual([]);
  });

  it('validates multiple fields in a single query', async () => {
    const results = await validateRequiredFields(
      esClient,
      'logs-endpoint*',
      [
        { name: 'process.name', type: 'keyword', ecs: true },
        { name: 'nonexistent.field', type: 'keyword' },
      ]
    );

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(2);
    expect(results[0].exists).toBe(true);
    expect(results[1].exists).toBe(false);
  });

  it('returns empty array when requiredFields is empty', async () => {
    const results = await validateRequiredFields(esClient, 'logs-*', []);

    expect(results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns empty array when indexPattern is empty', async () => {
    const results = await validateRequiredFields(
      esClient,
      '',
      [{ name: 'process.name', type: 'keyword' }]
    );

    expect(results).toEqual([]);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('preserves the original field object in results', async () => {
    const field = { name: 'process.name', type: 'keyword', ecs: true };
    const results = await validateRequiredFields(esClient, 'logs-*', [field]);

    expect(results[0].field).toBe(field);
  });
});
