/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExtractionClient } from './logs_extraction_client';
import type { CcsLogsExtractionClient } from './ccs_logs_extraction_client';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import {
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  HASHED_ID_FIELD,
} from './logs_extraction/logs_extraction_query_builder';
import { LogExtractionState, type EngineDescriptorClient } from './definitions/saved_objects';
import { ENGINE_STATUS } from './constants';
import type { EntityType } from '../../common/domain/definitions/entity_schema';

function createMockCcsLogsExtractionClient(): jest.Mocked<
  Pick<CcsLogsExtractionClient, 'extractToUpdates'>
> {
  return {
    extractToUpdates: jest.fn().mockResolvedValue({ count: 0, pages: 0 }),
  };
}

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
  let mockCcsLogsExtractionClient: ReturnType<typeof createMockCcsLogsExtractionClient>;

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
    mockCcsLogsExtractionClient = createMockCcsLogsExtractionClient();

    client = new LogsExtractionClient({
      logger: mockLogger,
      namespace: 'default',
      esClient: mockEsClient,
      dataViewsService: mockDataViewsService,
      engineDescriptorClient: mockEngineDescriptorClient as unknown as EngineDescriptorClient,
      ccsLogsExtractionClient: mockCcsLogsExtractionClient as unknown as CcsLogsExtractionClient,
    });
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
        fieldsToIgnore: [ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD],
        targetIndex: expect.stringContaining('.entities.v2.latest.security_default'),
        logger: expect.any(Object),
        abortController: undefined,
      });

      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        }),
        { mergeAttributes: false }
      );
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
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        }),
        { mergeAttributes: false }
      );
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
      expect(!result.success && result.error.message).toBe(
        'From 2024-01-02T12:00:00.000Z date is after to 2024-01-01T00:00:00.000Z date'
      );
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: {
          message: 'From 2024-01-02T12:00:00.000Z date is after to 2024-01-01T00:00:00.000Z date',
          action: 'extractLogs',
        },
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
      expect(!result.success && result.error.message).toBe(
        'From 2025-01-15T12:00:00.000Z date is after to 2025-01-15T10:59:00.000Z date'
      );
      expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
      expect(mockIngestEntities).not.toHaveBeenCalled();
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith('user', {
        error: {
          message: 'From 2025-01-15T12:00:00.000Z date is after to 2025-01-15T10:59:00.000Z date',
          action: 'extractLogs',
        },
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

    it('should filter out cross-cluster search (CCS) remote indices from main query and run CCS in parallel', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
          { name: 'entity.id', type: 'keyword' },
        ],
        values: [['2024-01-02T10:00:00.000Z', 'hash1', 'user:u1']],
      };

      const mockDataView = {
        getIndexPattern: jest
          .fn()
          .mockReturnValue('logs-*,remote_cluster:logs-*,other:filebeat-*,metrics-*'),
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
      // Main extraction uses local indices only; CCS client (injected) runs in parallel.
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(result.success && result.scannedIndices).toContain('metrics-*');
      expect(result.success && result.scannedIndices).toContain('remote_cluster:logs-*');
      expect(result.success && result.scannedIndices).toContain('other:filebeat-*');
      // Main query runs once; injected CCS client is invoked for remote patterns
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockCcsLogsExtractionClient.extractToUpdates).toHaveBeenCalledTimes(1);
      expect(mockCcsLogsExtractionClient.extractToUpdates).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user',
          remoteIndexPatterns: ['remote_cluster:logs-*', 'other:filebeat-*'],
        })
      );
    });

    it('should store CCS errors in the saved object while main execution remains unchanged', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: HASHED_ID_FIELD, type: 'keyword' },
          { name: 'entity.id', type: 'keyword' },
        ],
        values: [['2024-01-02T10:00:00.000Z', 'hash1', 'user:u1']],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*,remote_cluster:logs-*'),
      };

      const ccsError = new Error('CCS connection failed');
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);
      mockCcsLogsExtractionClient.extractToUpdates.mockResolvedValue({
        count: 0,
        pages: 0,
        error: ccsError,
      });

      const result = await client.extractLogs('user');

      // Main execution is unchanged: success, count from main query, ESQL and ingest called once
      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(1);
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(result.success && result.scannedIndices).toContain('remote_cluster:logs-*');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledTimes(1);

      // CCS error is stored in the saved object
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
          error: { message: ccsError.message, action: 'extractLogs' },
        }),
        { mergeAttributes: false }
      );
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
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'host',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        }),
        { mergeAttributes: false }
      );
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

  describe('getLocalAndRemoteIndexPatterns', () => {
    it('should split local and CCS remote index patterns', async () => {
      const mockDataView = {
        getIndexPattern: jest
          .fn()
          .mockReturnValue('logs-*,remote_cluster:logs-*,metrics-*,other:filebeat-*'),
      };
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);

      const { localIndexPatterns, remoteIndexPatterns } =
        await client.getLocalAndRemoteIndexPatterns(['custom-index']);

      expect(localIndexPatterns).toContain('logs-*');
      expect(localIndexPatterns).toContain('metrics-*');
      expect(localIndexPatterns).toContain('custom-index');
      expect(localIndexPatterns).not.toContain('remote_cluster:logs-*');
      expect(localIndexPatterns).not.toContain('other:filebeat-*');

      expect(remoteIndexPatterns).toContain('remote_cluster:logs-*');
      expect(remoteIndexPatterns).toContain('other:filebeat-*');
      expect(remoteIndexPatterns).not.toContain('logs-*');
      expect(remoteIndexPatterns).not.toContain('metrics-*');
    });

    it('should exclude alerts index from both local and remote', async () => {
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*,.alerts-security.alerts-default'),
      };
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);

      const { localIndexPatterns, remoteIndexPatterns } =
        await client.getLocalAndRemoteIndexPatterns();

      expect(localIndexPatterns).not.toContain('.alerts-security.alerts-default');
      expect(remoteIndexPatterns).not.toContain('.alerts-security.alerts-default');
    });
  });

  describe('getRemainingLogsCount', () => {
    it('should return document_count from ESQL response when engine is started', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'document_count', type: 'long' }],
        values: [[42]],
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

      const result = await client.getRemainingLogsCount('user');

      expect(result).toBe(42);
      expect(mockEngineDescriptorClient.findOrThrow).toHaveBeenCalledWith('user');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining('STATS document_count = COUNT()'),
      });
      expect(mockIngestEntities).not.toHaveBeenCalled();
    });

    it('should return 0 when ESQL response has no rows', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'document_count', type: 'long' }],
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

      const result = await client.getRemainingLogsCount('user');

      expect(result).toBe(0);
    });

    it('should return 0 when document_count column is missing', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'other_column', type: 'keyword' }],
        values: [['value']],
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

      const result = await client.getRemainingLogsCount('user');

      expect(result).toBe(0);
    });

    it('should use fromDateISO from extraction window and toDateISO as now', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'document_count', type: 'long' }],
        values: [[0]],
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

      await client.getRemainingLogsCount('user');

      const expectedFrom = moment.utc(fixedNow).subtract(3, 'hours').toISOString();
      const expectedTo = moment.utc(fixedNow).toISOString();

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

    it('should throw and log when executeEsqlQuery throws', async () => {
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

      await expect(client.getRemainingLogsCount('user')).rejects.toThrow('ESQL query failed');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get remaining logs count for entity type "user"')
      );
    });

    it('should pass recoveryId when engine has paginationId', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'document_count', type: 'long' }],
        values: [[5]],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      const descriptor = createMockEngineDescriptor('user') as Awaited<
        ReturnType<EngineDescriptorClient['findOrThrow']>
      >;
      descriptor.logExtractionState = {
        ...descriptor.logExtractionState,
        paginationId: 'recovery-cursor-id',
      };
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(descriptor);
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);

      const result = await client.getRemainingLogsCount('user');

      expect(result).toBe(5);
      // When recoveryId is set, buildExtractionSourceClause uses >= for timestamp (recovery boundary)
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringMatching(/@timestamp\s*>=\s*TO_DATETIME/),
      });
    });

    it('should convert document_count to number via Number()', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: 'document_count', type: 'long' }],
        values: [['100'] as unknown as ESQLSearchResponse['values'][0]],
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

      const result = await client.getRemainingLogsCount('user');

      expect(result).toBe(100);
    });
  });
});
