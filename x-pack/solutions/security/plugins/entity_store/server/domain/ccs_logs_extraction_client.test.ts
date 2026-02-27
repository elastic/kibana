/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { CcsLogsExtractionClient } from './ccs_logs_extraction_client';
import type { CRUDClient } from './crud_client';
import { getEntityDefinition } from '../../common/domain/definitions/registry';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import {
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  HASHED_ID_FIELD,
} from './logs_extraction/logs_extraction_query_builder';

const ENGINE_METADATA_UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';

jest.mock('../infra/elasticsearch/esql', () => {
  const actual = jest.requireActual<typeof import('../infra/elasticsearch/esql')>(
    '../infra/elasticsearch/esql'
  );
  return {
    ...actual,
    executeEsqlQuery: jest.fn(),
  };
});

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

function createMockCrudClient(): jest.Mocked<Pick<CRUDClient, 'upsertEntitiesBulk'>> {
  return {
    upsertEntitiesBulk: jest.fn().mockResolvedValue([]),
  };
}

describe('CcsLogsExtractionClient', () => {
  let client: CcsLogsExtractionClient;
  let mockCrudClient: ReturnType<typeof createMockCrudClient>;
  const mockLogger = loggerMock.create();
  const mockEsClient = {} as jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCrudClient = createMockCrudClient();
    client = new CcsLogsExtractionClient(
      mockLogger,
      mockEsClient,
      mockCrudClient as unknown as CRUDClient
    );
  });

  it('should extract to updates via CRUD client and return count and pages', async () => {
    const mockEsqlResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: HASHED_ID_FIELD, type: 'keyword' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T12:00:00.000Z', 'hash1', 'host:host-1'],
        ['2024-06-15T12:00:00.000Z', 'hash2', 'host:host-2'],
      ],
    };

    mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);

    const result = await client.extractToUpdates({
      type: 'host',
      remoteIndexPatterns: ['remote_cluster:logs-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-06-15T23:59:59.999Z',
      docsLimit: 10000,
      entityDefinition: getEntityDefinition('host', 'default'),
    });

    expect(result).toEqual({ count: 2, pages: 1 });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenCalledTimes(1);
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenCalledWith(
      expect.objectContaining({
        objects: expect.arrayContaining([
          { type: 'host', doc: expect.objectContaining({ 'entity.id': 'host:host-1' }) },
          { type: 'host', doc: expect.objectContaining({ 'entity.id': 'host:host-2' }) },
        ]),
        force: true,
        timestampGenerator: expect.any(Function),
      })
    );
  });

  it('should call upsertEntitiesBulk with flat entity doc (dot-notation keys)', async () => {
    mockExecuteEsqlQuery.mockResolvedValue({
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ],
      values: [['user:u1', 'alice']],
    });

    await client.extractToUpdates({
      type: 'user',
      remoteIndexPatterns: ['other:filebeat-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-01T23:59:59.999Z',
      docsLimit: 5000,
      entityDefinition: getEntityDefinition('user', 'default'),
    });

    const call = mockCrudClient.upsertEntitiesBulk.mock.calls[0];
    expect(call[0].objects).toEqual([
      { type: 'user', doc: { 'entity.id': 'user:u1', 'entity.name': 'alice' } },
    ]);
    expect(call[0]).toMatchObject({ force: true });
    const timestampGenerator = call[0].timestampGenerator;
    expect(timestampGenerator).toBeDefined();
    const ts = timestampGenerator!();
    const tsDate = new Date(ts);
    expect(tsDate.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01T23:59:59.999Z').getTime());
    expect(tsDate.getTime()).toBeLessThanOrEqual(
      new Date('2024-01-01T23:59:59.999Z').getTime() + 10001
    );
  });

  it('should paginate when ESQL returns full page and run upsert per page', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: ENGINE_METADATA_UNTYPED_ID_FIELD, type: 'keyword' },
        { name: HASHED_ID_FIELD, type: 'keyword' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'id1', 'hash1', 'host:h1'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'id2', 'hash2', 'host:h2'],
      ],
    };
    const secondPage: ESQLSearchResponse = {
      columns: firstPage.columns,
      values: [['2024-06-15T11:00:00.000Z', '2024-06-15T11:00:00.000Z', 'id3', 'hash3', 'host:h3']],
    };

    mockExecuteEsqlQuery.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

    const result = await client.extractToUpdates({
      type: 'host',
      remoteIndexPatterns: ['remote:logs-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-06-15T23:59:59.999Z',
      docsLimit,
      entityDefinition: getEntityDefinition('host', 'default'),
    });

    expect(result).toEqual({ count: 3, pages: 2 });
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenCalledTimes(2);
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        objects: expect.arrayContaining([
          { type: 'host', doc: expect.objectContaining({ 'entity.id': 'host:h1' }) },
          { type: 'host', doc: expect.objectContaining({ 'entity.id': 'host:h2' }) },
        ]),
        force: true,
        timestampGenerator: expect.any(Function),
      })
    );
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        objects: [{ type: 'host', doc: expect.objectContaining({ 'entity.id': 'host:h3' }) }],
        force: true,
        timestampGenerator: expect.any(Function),
      })
    );
  });

  it('should return error when second page ESQL call is aborted', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: ENGINE_METADATA_UNTYPED_ID_FIELD, type: 'keyword' },
        { name: HASHED_ID_FIELD, type: 'keyword' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'id1', 'hash1', 'host:h1'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'id2', 'hash2', 'host:h2'],
      ],
    };

    const abortError = new DOMException('aborted', 'AbortError');
    mockExecuteEsqlQuery.mockResolvedValueOnce(firstPage).mockRejectedValueOnce(abortError);

    const result = await client.extractToUpdates({
      type: 'host',
      remoteIndexPatterns: ['remote:logs-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-06-15T23:59:59.999Z',
      docsLimit,
      entityDefinition: getEntityDefinition('host', 'default'),
      abortController: new AbortController(),
    });

    await expect(result.error).toBeDefined();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockCrudClient.upsertEntitiesBulk).toHaveBeenCalledTimes(1);
  });

  it('should return zero count and pages when ESQL returns no rows', async () => {
    mockExecuteEsqlQuery.mockResolvedValue({
      columns: [{ name: HASHED_ID_FIELD, type: 'keyword' }],
      values: [],
    });

    const result = await client.extractToUpdates({
      type: 'host',
      remoteIndexPatterns: ['remote:logs-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-01T23:59:59.999Z',
      docsLimit: 10000,
      entityDefinition: getEntityDefinition('host', 'default'),
    });

    expect(result).toEqual({ count: 0, pages: 0 });
    expect(mockCrudClient.upsertEntitiesBulk).not.toHaveBeenCalled();
  });
});
