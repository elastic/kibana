/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { FindingDocument } from '../domain/models/finding_document_codec';
import { ElasticsearchFindingsWriter } from './elasticsearch_findings';

const finding = (id: string, overrides: Partial<FindingDocument> = {}): FindingDocument => ({
  candidateId: 'src/app.ts:1',
  catalogDocumentIds: [],
  cataloged: false,
  createdAt: '2026-10-02T00:00:00.000Z',
  evidence: [{ excerpt: 'logger.info(user.email)', line: 1, path: 'src/app.ts' }],
  extractorVersion: 'test',
  findingType: 'sensitive-data',
  id,
  logLevel: 'info',
  repository: 'elastic/example',
  revision: 'a'.repeat(40),
  signalType: 'log',
  summary: 'Logs the user email address at info level.',
  title: 'User email logged',
  updatedAt: '2026-10-02T00:00:00.000Z',
  ...overrides,
});

const mockClient = () => {
  const client = {
    bulk: jest.fn(async ({ operations }: { operations: unknown[]; refresh?: boolean }) => ({
      errors: false,
      items: Array.from({ length: operations.length / 2 }, () => ({ update: { status: 200 } })),
    })),
    deleteByQuery: jest.fn(async () => ({ deleted: 2, failures: [], timed_out: false })),
    indices: {
      create: jest.fn(async () => ({})),
      exists: jest.fn(async () => true),
      refresh: jest.fn(async () => ({})),
    },
  };
  return {
    client,
    writer: new ElasticsearchFindingsWriter(client as unknown as ElasticsearchClient, 'findings'),
  };
};

describe('ElasticsearchFindingsWriter.write', () => {
  it('upserts each finding, keeping status and created_at out of the update body', async () => {
    const { client, writer } = mockClient();

    const result = await writer.write([finding('f1')]);

    expect(result).toEqual({ status: 'success', value: { failures: [], writtenIds: ['f1'] } });
    expect(client.bulk).toHaveBeenCalledTimes(1);
    const { operations, refresh } = client.bulk.mock.calls[0]?.[0] ?? { operations: [] };
    expect(refresh).toBe(false);
    expect(operations[0]).toEqual({ update: { _index: 'findings', _id: 'f1' } });
    const body = operations[1] as { doc: Record<string, unknown>; upsert: Record<string, unknown> };
    expect(body.doc).not.toHaveProperty('status');
    expect(body.doc).not.toHaveProperty('created_at');
    expect(body.doc).toMatchObject({
      candidate_id: 'src/app.ts:1',
      cataloged: false,
      catalog_document_ids: [],
      finding_type: 'sensitive-data',
      log_level: 'info',
      repository: 'elastic/example',
      signal_type: 'log',
      title: 'User email logged',
      updated_at: '2026-10-02T00:00:00.000Z',
    });
    expect(body.upsert).toMatchObject({
      ...body.doc,
      created_at: '2026-10-02T00:00:00.000Z',
      status: 'open',
    });
  });

  it('omits log_level when the finding has none', async () => {
    const { client, writer } = mockClient();

    await writer.write([finding('f1', { logLevel: undefined, signalType: 'trace' })]);

    const body = client.bulk.mock.calls[0]?.[0].operations[1] as { doc: Record<string, unknown> };
    expect(body.doc).not.toHaveProperty('log_level');
    expect(body.doc.signal_type).toBe('trace');
  });

  it('creates the index with plain text title and summary mappings when it is missing', async () => {
    const { client, writer } = mockClient();
    client.indices.exists.mockResolvedValueOnce(false);

    await writer.write([finding('f1')]);

    expect(client.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'findings',
        mappings: expect.objectContaining({
          properties: expect.objectContaining({
            title: { type: 'text' },
            summary: { type: 'text' },
            status: { type: 'keyword' },
          }),
        }),
      })
    );
  });

  it('returns no-op success for an empty request without touching Elasticsearch', async () => {
    const { client, writer } = mockClient();

    expect(await writer.write([])).toEqual({
      status: 'success',
      value: { failures: [], writtenIds: [] },
    });
    expect(client.bulk).not.toHaveBeenCalled();
    expect(client.indices.exists).not.toHaveBeenCalled();
  });

  it('rejects duplicate IDs before writing', async () => {
    const { client, writer } = mockClient();

    expect(await writer.write([finding('f1'), finding('f1')])).toMatchObject({
      error: { code: 'duplicate_finding_id', retryable: false },
      status: 'failure',
    });
    expect(client.bulk).not.toHaveBeenCalled();
  });

  it('rejects a document that breaks the contract before writing', async () => {
    const { client, writer } = mockClient();

    expect(await writer.write([finding('f1', { revision: 'short' })])).toMatchObject({
      error: { code: 'invalid_findings_write_request', retryable: false },
      status: 'failure',
    });
    expect(client.bulk).not.toHaveBeenCalled();
  });

  it('reports rejected bulk items per document with retryability from the status', async () => {
    const { client, writer } = mockClient();
    client.bulk.mockResolvedValueOnce({
      errors: true,
      items: [
        { update: { status: 200 } },
        { update: { status: 429 } },
        { update: { status: 400 } },
      ],
    });

    const result = await writer.write([finding('f1'), finding('f2'), finding('f3')]);

    expect(result).toEqual({
      status: 'success',
      value: {
        failures: [
          {
            documentId: 'f2',
            error: expect.objectContaining({ code: 'findings_bulk_item_failure', retryable: true }),
          },
          {
            documentId: 'f3',
            error: expect.objectContaining({
              code: 'findings_bulk_item_failure',
              retryable: false,
            }),
          },
        ],
        writtenIds: ['f1'],
      },
    });
  });

  it('maps a transport error to a retryable failure', async () => {
    const { client, writer } = mockClient();
    client.bulk.mockRejectedValueOnce(new Error('connection reset'));

    expect(await writer.write([finding('f1')])).toEqual({
      error: {
        code: 'findings_transport_failure',
        message: 'Elasticsearch findings write failed.',
        retryable: true,
      },
      status: 'failure',
    });
  });
});

describe('ElasticsearchFindingsWriter.prune', () => {
  it('deletes only findings of the one repository outside the keep set, after a refresh', async () => {
    const { client, writer } = mockClient();

    const result = await writer.prune({ keepIds: ['a', 'b'], repository: 'elastic/example' });

    expect(result).toEqual({ status: 'success', value: { deleted: 2 } });
    expect(client.indices.refresh).toHaveBeenCalledWith({ index: 'findings' });
    expect(client.deleteByQuery).toHaveBeenCalledWith({
      index: 'findings',
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

  it('removes every finding of the repository when the keep set is empty', async () => {
    const { client, writer } = mockClient();

    const result = await writer.prune({ keepIds: [], repository: 'elastic/example' });

    expect(result).toEqual({ status: 'success', value: { deleted: 2 } });
    expect(client.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { bool: { filter: [{ term: { repository: 'elastic/example' } }] } },
      })
    );
  });

  it('rejects an empty repository without deleting anything', async () => {
    const { client, writer } = mockClient();

    expect(await writer.prune({ keepIds: ['a'], repository: '' })).toMatchObject({
      error: { code: 'invalid_findings_prune_request', retryable: false },
      status: 'failure',
    });
    expect(client.deleteByQuery).not.toHaveBeenCalled();
  });

  it('maps a transport error to a retryable failure', async () => {
    const { client, writer } = mockClient();
    client.deleteByQuery.mockRejectedValue(new Error('connection reset'));

    expect(await writer.prune({ keepIds: ['a'], repository: 'elastic/example' })).toEqual({
      error: {
        code: 'findings_prune_transport_failure',
        message: 'Elasticsearch findings prune failed.',
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

    expect(await writer.prune({ keepIds: ['a'], repository: 'elastic/example' })).toMatchObject({
      error: { code: 'findings_prune_incomplete', retryable: true },
      status: 'failure',
    });
  });
});
