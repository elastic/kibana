/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { catalogDocumentSource, ElasticsearchCatalogWriter } from './elasticsearch_catalog';

const mockClient = () => {
  const client = {
    deleteByQuery: jest.fn(async () => ({ deleted: 2, failures: [], timed_out: false })),
    indices: {
      create: jest.fn(async () => ({})),
      exists: jest.fn(async () => true),
      refresh: jest.fn(async () => ({})),
    },
  };
  return {
    client,
    writer: new ElasticsearchCatalogWriter(client as unknown as ElasticsearchClient, 'catalog'),
  };
};

describe('ElasticsearchCatalogWriter.prune', () => {
  it('deletes only documents of the one repository outside the keep set', async () => {
    const { client, writer } = mockClient();

    const result = await writer.prune({ keepIds: ['a', 'b'], repository: 'elastic/example' });

    expect(result).toEqual({ status: 'success', value: { deleted: 2 } });
    expect(client.indices.refresh).toHaveBeenCalledWith({ index: 'catalog' });
    expect(client.deleteByQuery).toHaveBeenCalledTimes(1);
    expect(client.deleteByQuery).toHaveBeenCalledWith({
      index: 'catalog',
      conflicts: 'proceed',
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { repository: 'elastic/example' } }],
          must_not: [{ ids: { values: ['a', 'b'] } }],
        },
      },
    });
    expect(client.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
      client.deleteByQuery.mock.invocationCallOrder[0] ?? 0
    );
  });

  it.each([
    ['an empty keep set', { keepIds: [], repository: 'elastic/example' }],
    ['an empty repository', { keepIds: ['a'], repository: '' }],
  ])('rejects %s without deleting anything', async (_label, request) => {
    const { client, writer } = mockClient();

    const result = await writer.prune(request);

    expect(result).toMatchObject({
      error: { code: 'invalid_catalog_prune_request', retryable: false },
      status: 'failure',
    });
    expect(client.deleteByQuery).not.toHaveBeenCalled();
  });

  it('maps a transport error to a retryable failure', async () => {
    const { client, writer } = mockClient();
    client.deleteByQuery.mockRejectedValue(new Error('connection reset'));

    const result = await writer.prune({ keepIds: ['a'], repository: 'elastic/example' });

    expect(result).toEqual({
      error: {
        code: 'catalog_prune_transport_failure',
        message: 'Elasticsearch catalog prune failed.',
        retryable: true,
      },
      status: 'failure',
    });
  });

  it.each([
    ['per-document delete failures', { failures: [{ id: 'x' }] as never[] }],
    ['version conflicts', { version_conflicts: 1 }],
    ['a timeout', { timed_out: true }],
  ])('reports %s as a retryable failure', async (_label, outcome) => {
    const { client, writer } = mockClient();
    client.deleteByQuery.mockResolvedValue({
      deleted: 1,
      failures: [],
      timed_out: false,
      ...outcome,
    });

    const result = await writer.prune({ keepIds: ['a'], repository: 'elastic/example' });

    expect(result).toMatchObject({
      error: { code: 'catalog_prune_incomplete', retryable: true },
      status: 'failure',
    });
  });
});

describe('catalogDocumentSource', () => {
  it('persists the concrete query under `query` without parameter metadata', () => {
    const source = catalogDocumentSource({
      document: {
        createdAt: '2026-09-28T00:00:00.000Z',
        description: 'Counts a source-instrumented span and its error outcomes.',
        evidence: [],
        extractorVersion: 'test',
        id: 'document-1',
        query: 'FROM traces*\n| WHERE name == "checkout"',
        repository: 'elastic/example',
        revision: 'a'.repeat(40),
        signalType: 'trace',
        sourceHash: `sha256:${'a'.repeat(64)}`,
        title: 'Span outcomes: checkout',
        updatedAt: '2026-09-28T00:00:00.000Z',
      },
      validation: { diagnostics: [], status: 'skipped' },
    });

    expect(source.query).toBe('FROM traces*\n| WHERE name == "checkout"');
    expect(source).not.toHaveProperty('templated_query');
    expect(source).not.toHaveProperty('parameters');
  });
});
