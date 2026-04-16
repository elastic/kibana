/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExtractionClient } from './logs_extraction_client';
import type { CcsLogsExtractionClient } from '.';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import moment from 'moment';
import { executeEsqlQuery } from '../../infra/elasticsearch/esql';
import { ingestEntities } from '../../infra/elasticsearch/ingest';
import { HASHED_ID_FIELD } from './logs_extraction_query_builder';
import {
  ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD,
  TIMESTAMP_FIELD,
} from './query_builder_commons';
import { LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD } from './log_pagination_probe_query_builder';

const LOG_PAGINATION_CURSOR_PROBE_COLUMNS: ESQLSearchResponse['columns'] = [
  { name: TIMESTAMP_FIELD, type: 'date' },
  { name: '_id', type: 'keyword' },
  { name: LOG_PAGINATION_CURSOR_TOTAL_LOGS_FIELD, type: 'long' },
];

/** Default total_logs > maxLogsPerPage so interpret marks a non-final slice (matches default config cap). */
function mockLogPaginationCursorProbeRow(
  timestamp: string,
  id: string,
  totalLogsInSlice: number = LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT + 1
): ESQLSearchResponse {
  return {
    columns: LOG_PAGINATION_CURSOR_PROBE_COLUMNS,
    values: [[timestamp, id, totalLogsInSlice]],
  };
}

function mockLogPaginationCursorProbeEmpty(): ESQLSearchResponse {
  return {
    columns: LOG_PAGINATION_CURSOR_PROBE_COLUMNS,
    values: [],
  };
}

/** First slice + extraction + terminal empty log pagination cursor probe (end of window). */
function mockExtractSuccessSequence(mainExtractionResponse: ESQLSearchResponse): void {
  mockExecuteEsqlQuery
    .mockResolvedValueOnce(
      mockLogPaginationCursorProbeRow(
        String(mainExtractionResponse.values.at(-1)?.[0] ?? '2024-01-02T12:00:00.000Z'),
        'log-slice-end-id'
      )
    )
    .mockResolvedValueOnce(mainExtractionResponse)
    .mockResolvedValueOnce(mockLogPaginationCursorProbeEmpty());
}
import {
  LogExtractionConfig,
  LOG_EXTRACTION_MAX_LOGS_PER_PAGE_DEFAULT,
  type EngineDescriptorClient,
  type EntityStoreGlobalState,
  type EntityStoreGlobalStateClient,
} from '../saved_objects';
import { ENGINE_STATUS } from '../constants';
import type { EntityType } from '../../../common/domain/definitions/entity_schema';

function createMockCcsLogsExtractionClient(): jest.Mocked<
  Pick<CcsLogsExtractionClient, 'extractToUpdates'>
> {
  return {
    extractToUpdates: jest.fn().mockResolvedValue({ count: 0, pages: 0 }),
  };
}

jest.mock('../../infra/elasticsearch/esql');
jest.mock('../../infra/elasticsearch/ingest');

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

function createMockEngineDescriptor(
  type: EntityType = 'user',
  overrides?: Partial<{
    lookbackPeriod: string;
    delay: string;
    paginationTimestamp: string;
    paginationId: string;
    lastExecutionTimestamp: string;
    logsPageCursorStartTimestamp: string;
    logsPageCursorStartId: string;
    logsPageCursorEndTimestamp: string;
    logsPageCursorEndId: string;
  }>
) {
  const logExtractionState = {
    paginationTimestamp: overrides?.paginationTimestamp,
    paginationId: overrides?.paginationId,
    lastExecutionTimestamp: overrides?.lastExecutionTimestamp,
    logsPageCursorStartTimestamp: overrides?.logsPageCursorStartTimestamp,
    logsPageCursorStartId: overrides?.logsPageCursorStartId,
    logsPageCursorEndTimestamp: overrides?.logsPageCursorEndTimestamp,
    logsPageCursorEndId: overrides?.logsPageCursorEndId,
  };
  return {
    type,
    status: ENGINE_STATUS.STARTED,
    logExtractionState,
    versionState: { version: 2, state: 'running' as const, isMigratedFromV1: false },
  };
}

function createMockGlobalStateClient(
  logExtractionOverrides?: Partial<{ lookbackPeriod: string; delay: string }>
): jest.Mocked<Pick<EntityStoreGlobalStateClient, 'find' | 'findOrThrow' | 'update'>> {
  const logsExtraction = LogExtractionConfig.parse({
    docsLimit: 10000,
    additionalIndexPatterns: [],
    lookbackPeriod: logExtractionOverrides?.lookbackPeriod ?? '3h',
    delay: logExtractionOverrides?.delay ?? '1m',
  });
  const state = { logsExtraction } as EntityStoreGlobalState;
  return {
    find: jest.fn().mockResolvedValue(state),
    findOrThrow: jest.fn().mockResolvedValue(state),
    update: jest.fn().mockResolvedValue({}),
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
  let mockGlobalStateClient: ReturnType<typeof createMockGlobalStateClient>;
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
    mockGlobalStateClient = createMockGlobalStateClient();
    mockCcsLogsExtractionClient = createMockCcsLogsExtractionClient();

    client = new LogsExtractionClient({
      logger: mockLogger,
      namespace: 'default',
      esClient: mockEsClient,
      dataViewsService: mockDataViewsService,
      engineDescriptorClient: mockEngineDescriptorClient as unknown as EngineDescriptorClient,
      globalStateClient: mockGlobalStateClient as unknown as EntityStoreGlobalStateClient,
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
      mockExtractSuccessSequence(mockEsqlResponse);
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
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
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
            logsPageCursorStartTimestamp: undefined,
            logsPageCursorStartId: undefined,
            logsPageCursorEndTimestamp: undefined,
            logsPageCursorEndId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        })
      );
    });

    it('should handle empty results from ESQL query', async () => {
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(0);

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledTimes(0);
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            logsPageCursorStartTimestamp: undefined,
            logsPageCursorStartId: undefined,
            logsPageCursorEndTimestamp: undefined,
            logsPageCursorEndId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        })
      );
    });

    it('should compute extraction window from lookbackPeriod and delay when no custom range', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      const globalStateWithDelay5s = {
        logsExtraction: LogExtractionConfig.parse({ lookbackPeriod: '3h', delay: '5s' }),
      } as EntityStoreGlobalState;
      mockGlobalStateClient.find.mockResolvedValue(globalStateWithDelay5s);
      mockGlobalStateClient.findOrThrow.mockResolvedValue(globalStateWithDelay5s);
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
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

    it('should use logsPageCursorStartTimestamp as from when no lastExecutionTimestamp (not lookback)', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const logPageCursorStart = '2025-01-15T06:00:00.000Z';
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      const globalStateWithDelay5s = {
        logsExtraction: LogExtractionConfig.parse({ lookbackPeriod: '3h', delay: '5s' }),
      } as EntityStoreGlobalState;
      mockGlobalStateClient.find.mockResolvedValue(globalStateWithDelay5s);
      mockGlobalStateClient.findOrThrow.mockResolvedValue(globalStateWithDelay5s);
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user', {
          logsPageCursorStartTimestamp: logPageCursorStart,
          logsPageCursorStartId: 'cursor-doc',
        }) as Awaited<ReturnType<EngineDescriptorClient['findOrThrow']>>
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('user');

      const lookbackFrom = moment.utc(fixedNow).subtract(3, 'hours').toISOString();
      expect(lookbackFrom).not.toBe(logPageCursorStart);

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(logPageCursorStart),
      });
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.not.stringContaining(lookbackFrom),
      });

      jest.useRealTimers();
    });

    it('should prefer logsPageCursorStartTimestamp over delayed lastExecutionTimestamp when both are set', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const logPageCursorStart = '2025-01-15T06:00:00.000Z';
      const lastExecutionTimestamp = '2025-01-15T11:00:00.000Z';
      const delayedLastExecution = moment
        .utc(lastExecutionTimestamp)
        .subtract(5, 'seconds')
        .toISOString();

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      const globalStateWithDelay5s = {
        logsExtraction: LogExtractionConfig.parse({ lookbackPeriod: '3h', delay: '5s' }),
      } as EntityStoreGlobalState;
      mockGlobalStateClient.find.mockResolvedValue(globalStateWithDelay5s);
      mockGlobalStateClient.findOrThrow.mockResolvedValue(globalStateWithDelay5s);
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user', {
          logsPageCursorStartTimestamp: logPageCursorStart,
          logsPageCursorStartId: 'cursor-doc',
          lastExecutionTimestamp,
        }) as Awaited<ReturnType<EngineDescriptorClient['findOrThrow']>>
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('user');

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(logPageCursorStart),
      });
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.not.stringContaining(delayedLastExecution),
      });

      jest.useRealTimers();
    });

    it('should use paginationTimestamp as from and subtract delay for to', async () => {
      const fixedNow = new Date('2025-01-15T12:00:00.000Z');
      jest.useFakeTimers({ now: fixedNow.getTime() });

      const paginationTimestamp = '2025-01-15T10:30:00.000Z';

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
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
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
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
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
      mockExtractSuccessSequence(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user', {
        specificWindow: {
          fromDateISO: '2024-01-01T00:00:00.000Z',
          toDateISO: '2024-01-02T00:00:00.000Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(2);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
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
      mockExecuteEsqlQuery
        .mockResolvedValueOnce(mockLogPaginationCursorProbeRow('2024-01-02T10:00:00.000Z', 'e'))
        .mockResolvedValueOnce(mockEsqlResponse);
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
      mockExtractSuccessSequence(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      // Main extraction uses local indices only; CCS client (injected) runs in parallel.
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(result.success && result.scannedIndices).toContain('metrics-*');
      expect(result.success && result.scannedIndices).toContain('remote_cluster:logs-*');
      expect(result.success && result.scannedIndices).toContain('other:filebeat-*');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
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
      mockExtractSuccessSequence(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);
      mockCcsLogsExtractionClient.extractToUpdates.mockResolvedValue({
        count: 0,
        pages: 0,
        error: ccsError,
      });

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.success && result.count).toBe(1);
      expect(result.success && result.scannedIndices).toContain('logs-*');
      expect(result.success && result.scannedIndices).toContain('remote_cluster:logs-*');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
      expect(mockIngestEntities).toHaveBeenCalledTimes(1);

      // CCS error is stored in the saved object
      expect(mockEngineDescriptorClient.update).toHaveBeenCalledWith(
        'user',
        expect.objectContaining({
          logExtractionState: expect.objectContaining({
            paginationTimestamp: undefined,
            paginationId: undefined,
            logsPageCursorStartTimestamp: undefined,
            logsPageCursorStartId: undefined,
            logsPageCursorEndTimestamp: undefined,
            logsPageCursorEndId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
          error: { message: ccsError.message, action: 'extractLogs' },
        })
      );
    });

    it('should fallback to logs-* when data view is not found', async () => {
      mockEngineDescriptorClient.findOrThrow.mockResolvedValue(
        createMockEngineDescriptor('user') as Awaited<
          ReturnType<EngineDescriptorClient['findOrThrow']>
        >
      );
      const error = new Error('Data view not found');
      mockDataViewsService.get.mockRejectedValue(error);
      mockExecuteEsqlQuery.mockResolvedValue(mockLogPaginationCursorProbeEmpty());
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
      mockExtractSuccessSequence(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('host');

      expect(mockEngineDescriptorClient.findOrThrow).toHaveBeenCalledWith('host');
      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(3);
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
            logsPageCursorStartTimestamp: undefined,
            logsPageCursorStartId: undefined,
            logsPageCursorEndTimestamp: undefined,
            logsPageCursorEndId: undefined,
            lastExecutionTimestamp: expect.any(String),
          }),
        })
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

  describe('updateConfig', () => {
    it('should merge provided params over current config and persist via globalStateClient', async () => {
      await client.updateConfig({ delay: '5m' });

      expect(mockGlobalStateClient.findOrThrow).toHaveBeenCalledTimes(1);
      expect(mockGlobalStateClient.update).toHaveBeenCalledWith({
        logsExtraction: expect.objectContaining({ delay: '5m' }),
      });
    });

    it('should return the merged config', async () => {
      const result = await client.updateConfig({ delay: '5m', frequency: '2m' });

      expect(result.delay).toBe('5m');
      expect(result.frequency).toBe('2m');
    });

    it('should preserve existing config values not present in params', async () => {
      // createMockGlobalStateClient sets lookbackPeriod to '3h'
      const result = await client.updateConfig({ delay: '5m' });

      expect(result.lookbackPeriod).toBe('3h');
    });

    it('should apply defaults for any config fields absent from both params and current state', async () => {
      // logsExtraction from mock has all fields set via LogExtractionConfig.parse
      // providing no params should keep the full config intact
      const result = await client.updateConfig({});

      expect(result.delay).toBe('1m');
      expect(result.lookbackPeriod).toBe('3h');
      expect(result.docsLimit).toBe(10000);
    });

    it('should update multiple fields at once', async () => {
      const result = await client.updateConfig({
        filter: 'agent.type:filebeat',
        additionalIndexPatterns: ['custom-logs-*'],
        lookbackPeriod: '6h',
        delay: '30s',
        frequency: '1m',
        docsLimit: 5000,
        fieldHistoryLength: 5,
      });

      expect(result.filter).toBe('agent.type:filebeat');
      expect(result.additionalIndexPatterns).toEqual(['custom-logs-*']);
      expect(result.lookbackPeriod).toBe('6h');
      expect(result.delay).toBe('30s');
      expect(result.frequency).toBe('1m');
      expect(result.docsLimit).toBe(5000);
      expect(result.fieldHistoryLength).toBe(5);
    });

    it('should throw when global state is not found', async () => {
      const notFoundError = new Error('No global state found for this namespace');
      mockGlobalStateClient.findOrThrow.mockRejectedValue(notFoundError);

      await expect(client.updateConfig({ delay: '5m' })).rejects.toThrow(
        'No global state found for this namespace'
      );
      expect(mockGlobalStateClient.update).not.toHaveBeenCalled();
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
      } as typeof descriptor.logExtractionState;
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
