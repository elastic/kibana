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
import { executeEsqlQuery } from '../infra/elasticsearch/esql';
import { ingestEntities } from '../infra/elasticsearch/ingest';
import { HASHED_ID } from './logs_extraction/logs_extraction_query_builder';

jest.mock('../infra/elasticsearch/esql');
jest.mock('../infra/elasticsearch/ingest');

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockIngestEntities = ingestEntities as jest.MockedFunction<typeof ingestEntities>;

describe('LogsExtractionClient', () => {
  let client: LogsExtractionClient;
  let mockLogger: ReturnType<typeof loggerMock.create>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockDataViewsService: jest.Mocked<DataViewsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = loggerMock.create();
    mockEsClient = {} as jest.Mocked<ElasticsearchClient>;
    mockDataViewsService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<DataViewsService>;

    client = new LogsExtractionClient(mockLogger, 'default', mockEsClient, mockDataViewsService);
  });

  describe('extractLogs', () => {
    it('should successfully extract logs and ingest entities', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: HASHED_ID, type: 'keyword' },
          { name: 'user.name', type: 'keyword' },
          { name: 'host.name', type: 'keyword' },
        ],
        values: [
          ['hash1', 'user1', 'host1'],
          ['hash2', 'user2', 'host2'],
        ],
      };

      const mockDataView = {
        getIndexPattern: jest
          .fn()
          .mockReturnValue('logs-*,filebeat-*,.alerts-security.alerts-default'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.scannedIndices).toContain('logs-*');
      expect(result.scannedIndices).toContain('filebeat-*');
      expect(result.scannedIndices).toContain('.entities.v2.updates.security_user_default');
      expect(result.scannedIndices).not.toContain('.alerts-security.alerts-default');

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.any(String),
      });

      expect(mockIngestEntities).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledWith({
        esClient: mockEsClient,
        esqlResponse: mockEsqlResponse,
        esIdField: HASHED_ID,
        targetIndex: expect.stringContaining('.entities.v2.latest.security_user_default'),
        logger: expect.any(Object),
      });
    });

    it('should handle empty results from ESQL query', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [
          { name: HASHED_ID, type: 'keyword' },
          { name: 'user.name', type: 'keyword' },
        ],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledTimes(1);
    });

    it('should use custom date range when provided', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: HASHED_ID, type: 'keyword' }],
        values: [],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const fromDate = '2024-01-01T00:00:00.000Z';
      const toDate = '2024-01-02T00:00:00.000Z';

      await client.extractLogs('user', { fromDateISO: fromDate, toDateISO: toDate });

      expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
        esClient: mockEsClient,
        query: expect.stringContaining(fromDate),
      });
    });

    it('should handle errors from executeEsqlQuery', async () => {
      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      const testError = new Error('ESQL query failed');
      mockExecuteEsqlQuery.mockRejectedValue(testError);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(result.error).toBe(testError);
      expect(mockIngestEntities).not.toHaveBeenCalled();
    });

    it('should handle errors from ingestEntities', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: HASHED_ID, type: 'keyword' }],
        values: [['hash1']],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      const testError = new Error('Ingestion failed');
      mockIngestEntities.mockRejectedValue(testError);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(false);
      expect(result.error).toBe(testError);
    });

    it('should fallback to logs-* when data view is not found', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: HASHED_ID, type: 'keyword' }],
        values: [],
      };

      const error = new Error('Data view not found');
      mockDataViewsService.get.mockRejectedValue(error);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      const result = await client.extractLogs('user');

      expect(result.success).toBe(true);
      expect(result.scannedIndices).toContain('logs-*');
      expect(result.error).toBeUndefined();
    });

    it('should work with different entity types', async () => {
      const mockEsqlResponse: ESQLSearchResponse = {
        columns: [{ name: HASHED_ID, type: 'keyword' }],
        values: [['hash1']],
      };

      const mockDataView = {
        getIndexPattern: jest.fn().mockReturnValue('logs-*'),
      };

      mockDataViewsService.get.mockResolvedValue(mockDataView as any);
      mockExecuteEsqlQuery.mockResolvedValue(mockEsqlResponse);
      mockIngestEntities.mockResolvedValue(undefined);

      await client.extractLogs('host');

      expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
      expect(mockIngestEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          targetIndex: expect.stringContaining('.entities.v2.latest.security_host_default'),
        })
      );
    });
  });
});
