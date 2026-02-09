/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExtractionClient } from './logs_extraction_client';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import { HASHED_ID_FIELD } from './logs_extraction/logs_extraction_query_builder';
import { LogExtractionState, type EngineDescriptorClient } from './definitions/saved_objects';
import { ENGINE_STATUS } from './constants';
import type { EntityType } from '../../common/domain/definitions/entity_schema';

jest.mock('../infra/elasticsearch/esql');
jest.mock('../infra/elasticsearch/ingest');

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

function createMockEngineDescriptor(
  type: EntityType = 'user',
  overrides?: Partial<{ lookbackPeriod: string; delay: string; paginationTimestamp: string }>
) {
  const logExtractionState = LogExtractionState.parse({
    docsLimit: 10000,
    additionalIndexPatterns: [],
    lookbackPeriod: overrides?.lookbackPeriod ?? '3h',
    delay: overrides?.delay ?? '1m',
    paginationTimestamp: overrides?.paginationTimestamp,
  });
  return {
    type,
    status: ENGINE_STATUS.STARTED,
    logExtractionState,
    versionState: { version: 2, state: 'running' as const, isMigratedFromV1: false },
  };
}

describe('LogsExtractionClient', () => {
  let client: LogsExtractionClient;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockDataViewsService: jest.Mocked<DataViewsService>;
  let mockEngineDescriptorClient: jest.Mocked<
    Pick<EngineDescriptorClient, 'findOrThrow' | 'update'>
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggerMock.create();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockDataViewsService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<DataViewsService>;
    mockEngineDescriptorClient = {
      findOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    };

    client = new LogsExtractionClient(
      mockLogger,
      'default',
      mockEsClient,
      mockDataViewsService,
      mockEngineDescriptorClient as unknown as EngineDescriptorClient
    );
  });

  describe('extractLogs', () => {
    it('should successfully extract logs and ingest entities', async () => {
      const lastTimestamp = '2024-01-02T12:00:00.000Z';
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
          { name: 'user.name', type: 'keyword' },
          { name: 'host.name', type: 'keyword' },
        ],
        values: [
          ['2024-01-02T10:00:00.000Z', 'hash1', 'user1', 'host1'],
          [lastTimestamp, 'hash2', 'user2', 'host2'],
        ],
      };

      const mockDataView = {
        getIndexPattern: jest
          .fn()
          .mockReturnValue('logs-*,filebeat-*,.alerts-security.alerts-default'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(2);
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(result.success && result.scannedIndices).toContain('filebeat-*');
      expect(result.success && result.scannedIndices).toContain(
        '.entities.v2.updates.security_default'
      );
      expect(result.success && result.scannedIndices).not.toContain(
        '.alerts-security.alerts-default'
      );

      expect(mockEngineDescriptorClient.findOrThrow).toHaveBeenCalledWith('user');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.any(String),
      });

      expect(mockIngestEntities).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledWith({
        esClient: mockEsClient,
        esqlResponse: mockEsqlResponse,
        esIdField: HASHED_ID_FIELD,
        targetIndex: expect.stringContaining('.entities.v2.latest.security_default'),
        logger: expect.any(Object),
      });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        logExtractionState: expect.objectContaining({
          paginationTimestamp: lastTimestamp,
          lastExecutionTimestamp: expect.any(String),
        }),
      });
    });

    it('should handle empty results from ESQL query', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
          { name: 'user.name', type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(0);

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledTimes(1);
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        logExtractionState: expect.objectContaining({
          paginationTimestamp: expect.any(String),
          lastExecutionTimestamp: expect.any(String),
        }),
      });
    });

    it('should compute extraction window from lookbackPeriod and delay when no custom range', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user', { lookbackPeriod: '3h', delay: '5s' }) as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('user');

      const expectedFrom = moment.utc(fixedNow).subtract(3, 'hours').toISOString();
      const expectedTo = moment.utc(fixedNow).subtract(5, 'seconds').toISOString();

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(expectedFrom),
      });
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(expectedTo),
      });

      jest.useRealTimers();
    });

    it('should use paginationTimestamp as from and subtract delay for to', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const paginationTimestamp = '2025-01-15T10:30:00.000Z';
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user', {
          lookbackPeriod: '3h',
          delay: '1m',
          paginationTimestamp,
        }) as Awaited<ReturnType<EngineDescriptorClient['findOrThrow']>>
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('user');

      const expectedTo = moment.utc(fixedNow).subtract(1, 'minute').toISOString();

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(paginationTimestamp),
      });
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(expectedTo),
      });

      jest.useRealTimers();
    });

    it('should return error when specificWindow has from date after to date', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue({
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      } as any);

      const fromDate = '2024-01-02T12:00:00.000Z';
      const toDate = '2024-01-01T00:00:00.000Z';

      const result = await client.extractLogs('user', {
        specificWindow: { fromDateISO: fromDate, toDateISO: toDate },
      });

      expect(result.success).toBe(false);
      expect(!result.success && result.error.message).toBe('From date is after to date');
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: { message: 'From date is after to date', action: 'extractLogs' },
      });
    });

    it('should return error when computed extraction window has from date after to date', async () => {
      const fixedNow = new Date('2025-01-15T11:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const paginationTimestamp = '2025-01-15T12:00:00.000Z'; // after fixedNow
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user', {
          lookbackPeriod: '3h',
          delay: '1m',
          paginationTimestamp,
        }) as Awaited<ReturnType<EngineDescriptorClient['findOrThrow']>>
      );
      mockDataViewsService.get.mockResolvedValue({
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      } as any);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(!result.success && result.error.message).toBe('From date is after to date');
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: { message: 'From date is after to date', action: 'extractLogs' },
      });

      jest.useRealTimers();
    });

    it('should use custom date range when provided', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const fromDate = '2024-01-01T00:00:00.000Z';
      const toDate = '2024-01-02T00:00:00.000Z';

      await client.extractLogs('user', {
        specificWindow: { fromDateISO: fromDate, toDateISO: toDate },
      });

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(fromDate),
      });
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(toDate),
      });
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });

    it('should not update engine descriptor when specificWindow is provided', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [
          ['2024-01-02T10:00:00.000Z', 'hash1'],
          ['2024-01-02T12:00:00.000Z', 'hash2'],
        ],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user', {
        specificWindow: {
          fromDateISO: '2024-01-01T00:00:00.000Z',
          toDateISO: '2024-01-02T00:00:00.000Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(2);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledTimes(1);
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });

    it('should run query and return count without ingesting or updating when countOnly is true', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
          { name: 'user.name', type: 'keyword' },
        ],
        values: [
          ['2024-01-02T10:00:00.000Z', 'hash1', 'user1'],
          ['2024-01-02T11:00:00.000Z', 'hash2', 'user2'],
          ['2024-01-02T12:00:00.000Z', 'hash3', 'user3'],
        ],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);

      const result = await client.extractLogs('user', { countOnly: true });

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(3);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });

    it('should return count 0 when countOnly is true and ESQL returns no rows', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);

      const result = await client.extractLogs('user', { countOnly: true });

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(0);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });

    it('should handle errors from executeEsqlQuery', async () => {
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      const testError = new Error('ESQL query failed');
      mockExecuteEsqlQuery.mockRejectedValue(testError);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(!result.success && result.error).toBe(testError);
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: { message: testError.message, action: 'extractLogs' },
      });
    });

    it('should handle errors from ingestEntities', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [['2024-01-02T10:00:00.000Z', 'hash1']],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      const testError = new Error('Ingestion failed');
      mockIngestEntities.mockRejectedValue(testError);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(!result.success && result.error).toBe(testError);
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: { message: testError.message, action: 'extractLogs' },
      });
    });

    it('should fallback to logs-* when data view is not found', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [],
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      const error = new Error('Data view not found');
      mockDataViewsService.get.mockRejectedValue(error);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(!result.success && result.error).toBeFalsy();
    });

    it('should work with different entity types', async () => {
      const lastTimestamp = '2024-01-02T11:00:00.000Z';
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
        ],
        values: [[lastTimestamp, 'hash1']],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('host') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('host');

      expect(mockEngineDescriptorClient.findOrThrow).toHaveBeenCalledWith('host');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          targetIndex: expect.stringContaining('.entities.v2.latest.security_default'),
        })
      );
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('host', {
        logExtractionState: expect.objectContaining({
          paginationTimestamp: lastTimestamp,
          lastExecutionTimestamp: expect.any(String),
        }),
      });
    });

    it('should return success false when engine is not started', async () => {
      const descriptor = createMockEngineDescriptor('user');
      descriptor.status = 'stopped';

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        descriptor as Awaited<ReturnType<EngineDescriptorClient['findOrThrow']>>
      );

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(!result.success && result.error.message).toContain(
        'Entity store is not started for type user'
      );
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).not.toHaveBeenCalled();
    });
  });
});
