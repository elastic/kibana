/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { CcsLogsExtractionClient } from '.';
import { getEntityDefinition } from '../../../common/domain/definitions/registry';
import { getUpdatesEntitiesDataStreamName } from '../asset_manager/updates_data_stream';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD } from './query_builder_commons';
import { get } from 'lodash';

jest.mock('../../infra/elasticsearch/esql', () => {
  const actual = jest.requireActual<typeof import('../../infra/elasticsearch/esql')>(
    '../../infra/elasticsearch/esql'
  );
  return {
    ...actual,
    executeEsqlQuery: jest.fn(),
  };
});

jest.mock('../../infra/elasticsearch/ingest', () => ({
  ingestEntities: jest.fn().mockResolvedValue(undefined),
}));

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

describe('CcsLogsExtractionClient', () => {
  const mockLogger = loggerMock.create();
  const mockEsClient = {} as unknown as jest.Mocked<ElasticsearchClient>;
  const namespace = 'default';

  let client: CcsLogsExtractionClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new CcsLogsExtractionClient(mockLogger, mockEsClient, namespace);
  });

  it('should extract to updates via bulk and return count and pages', async () => {
    const mockEsqlResponse: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T12:00:00.000Z', 'host:host-1', 'asset'],
        ['2024-06-15T12:00:00.000Z', 'host:host-2', 'asset'],
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
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).toHaveBeenCalledWith({
      esClient: mockEsClient,
      esqlResponse: mockEsqlResponse,
      targetIndex: getUpdatesEntitiesDataStreamName(namespace),
      logger: mockLogger,
      fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
      transformDocument: expect.any(Function),
    });
    const transformDocument = mockIngestEntities.mock.calls[0][0].transformDocument!;
    const doc1 = transformDocument({
      '@timestamp': '2024-06-15T12:00:00.000Z',
      'entity.id': 'host:host-1',
      'event.kind': 'asset',
    }) as Record<string, unknown>;
    expect(doc1['@timestamp']).toBeDefined();
    expect((doc1 as { event?: { kind?: string } }).event?.kind).toBe('asset');
    expect(get(doc1, ['host', 'entity', 'id'])).toBe('host:host-1');
  });

  it('should call bulk with flat entity doc and event.kind asset', async () => {
    mockExecuteEsqlQuery.mockResolvedValue({
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [['user:u1', 'alice', 'asset']],
    });

    await client.extractToUpdates({
      type: 'user',
      remoteIndexPatterns: ['other:filebeat-*'],
      fromDateISO: '2024-01-01T00:00:00.000Z',
      toDateISO: '2024-01-01T23:59:59.999Z',
      docsLimit: 5000,
      entityDefinition: getEntityDefinition('user', 'default'),
    });

    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    expect(mockIngestEntities).toHaveBeenCalledWith(
      expect.objectContaining({
        targetIndex: getUpdatesEntitiesDataStreamName(namespace),
        fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
      })
    );
    const transformDocument = mockIngestEntities.mock.calls[0][0].transformDocument!;
    const doc = transformDocument({
      'entity.id': 'user:u1',
      'entity.name': 'alice',
      'event.kind': 'asset',
    }) as Record<string, unknown>;
    expect((doc as { user?: { entity?: { id?: string } } }).user?.entity?.id).toBe('user:u1');
    expect(doc.user).toBeDefined();
    expect((doc as { event?: { kind?: string } }).event?.kind).toBe('asset');
    expect(doc['@timestamp']).toBeDefined();
    const ts = new Date(doc['@timestamp'] as string).getTime();
    expect(ts).toBeGreaterThanOrEqual(new Date('2024-01-01T23:59:59.999Z').getTime());
    expect(ts).toBeLessThanOrEqual(new Date('2024-01-01T23:59:59.999Z').getTime() + 10001);
  });

  it('should paginate when ESQL returns full page and run bulk per page', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h1', 'asset'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h2', 'asset'],
      ],
    };
    const secondPage: ESQLSearchResponse = {
      columns: firstPage.columns,
      values: [['2024-06-15T11:00:00.000Z', '2024-06-15T11:00:00.000Z', 'host:h3', 'asset']],
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
    expect(mockIngestEntities).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        esqlResponse: firstPage,
        targetIndex: getUpdatesEntitiesDataStreamName(namespace),
        fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
      })
    );
    expect(mockIngestEntities).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        esqlResponse: secondPage,
        targetIndex: getUpdatesEntitiesDataStreamName(namespace),
      })
    );
    const secondCallTransform = mockIngestEntities.mock.calls[1][0].transformDocument!;
    const doc3 = secondCallTransform({
      '@timestamp': '2024-06-15T11:00:00.000Z',
      'entity.id': 'host:h3',
      'event.kind': 'asset',
    }) as Record<string, unknown>;
    expect((doc3 as { event?: { kind?: string } }).event?.kind).toBe('asset');
    expect((doc3 as { host?: { entity?: { id?: string } } }).host?.entity?.id).toBe('host:h3');
  });

  it('should return error when second page ESQL call is aborted', async () => {
    const docsLimit = 2;
    const firstPage: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD, type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'event.kind', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h1', 'asset'],
        ['2024-06-15T10:00:00.000Z', '2024-06-15T10:00:00.000Z', 'host:h2', 'asset'],
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

    expect(result.error).toBeDefined();

    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockIngestEntities).toHaveBeenCalledTimes(1);
  });

  it('should return zero count and pages when ESQL returns no rows', async () => {
    mockExecuteEsqlQuery.mockResolvedValue({
      columns: [],
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
    expect(mockIngestEntities).not.toHaveBeenCalled();
  });
});
