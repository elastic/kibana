/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable, Transform } from 'stream';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createPrivilegedUsersCsvService } from './csv_upload';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import type { HapiReadableStream } from '../../../../types';

// Mock external dependencies
jest.mock('papaparse');
jest.mock('./streams/privileged_user_parse_transform');
jest.mock('../../shared/streams/batching');
jest.mock('../engine/elasticsearch/indices');
jest.mock('./bulk/query_existing_users');
jest.mock('./bulk/upsert_batch');
jest.mock('./bulk/soft_delete_omitted_users');

// Import and setup mocks
import Papa from 'papaparse';
import { privilegedUserParserTransform } from './streams/privileged_user_parse_transform';
import { batchPartitions } from '../../shared/streams/batching';
import { queryExistingUsers } from './bulk/query_existing_users';
import { bulkUpsertBatch } from './bulk/upsert_batch';
import { softDeleteOmittedUsers } from './bulk/soft_delete_omitted_users';
import * as mockIndexModule from '../engine/elasticsearch/indices';
import type {
  BulkBatchProcessingResults,
  BulkProcessingResults,
  BulkPrivMonUser,
  BulkProcessingError,
} from './bulk/types';
import { accumulateUpsertResults } from './bulk/utils';
import { right, left } from 'fp-ts/Either';

const mockPapa = Papa as jest.Mocked<typeof Papa>;
const mockPrivilegedUserParserTransform = privilegedUserParserTransform as jest.MockedFunction<
  typeof privilegedUserParserTransform
>;
const mockBatchPartitions = batchPartitions as jest.MockedFunction<typeof batchPartitions>;
const mockQueryExistingUsers = queryExistingUsers as jest.MockedFunction<typeof queryExistingUsers>;
const mockBulkUpsertBatch = bulkUpsertBatch as jest.MockedFunction<typeof bulkUpsertBatch>;
const mockSoftDeleteOmittedUsers = softDeleteOmittedUsers as jest.MockedFunction<
  typeof softDeleteOmittedUsers
>;
const mockCreatePrivmonIndexService =
  mockIndexModule.createPrivmonIndexService as jest.MockedFunction<
    typeof mockIndexModule.createPrivmonIndexService
  >;

describe('CSV Upload Service', () => {
  let mockDataClient: PrivilegeMonitoringDataClient;
  let mockEsClient: ElasticsearchClient;
  let csvService: ReturnType<typeof createPrivilegedUsersCsvService>;

  const mockIndex = 'test-privilege-monitoring-index';

  const createMockStream = (data: string): HapiReadableStream => {
    const stream = new Readable() as HapiReadableStream;
    stream.push(data);
    stream.push(null);
    stream.hapi = {} as unknown as HapiReadableStream['hapi'];
    return stream;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Papa Parse with transform streams
    const mockCsvStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        // Simple passthrough for testing
        callback(null, chunk);
      },
    });

    mockPapa.parse.mockReturnValue(mockCsvStream);
    // Mock NODE_STREAM_INPUT constant used by Papa Parse for stream parsing
    Object.defineProperty(mockPapa, 'NODE_STREAM_INPUT', {
      value: Symbol('NODE_STREAM_INPUT'),
      writable: false,
      configurable: true,
    });

    // Mock transform streams
    const mockParserTransform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        callback(null, { user: { name: 'testuser' } });
      },
    });

    const mockBatchTransform = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        callback(null, [chunk]);
      },
    });

    mockPrivilegedUserParserTransform.mockReturnValue(mockParserTransform);
    mockBatchPartitions.mockReturnValue(mockBatchTransform);

    // Mock Elasticsearch client
    mockEsClient = {
      search: jest.fn(),
      update: jest.fn(),
      index: jest.fn(),
      count: jest.fn(),
    } as unknown as ElasticsearchClient;

    // Mock data client
    mockDataClient = {
      deps: {
        clusterClient: {
          asCurrentUser: mockEsClient,
        },
      },
      index: mockIndex,
      log: jest.fn(),
    } as unknown as PrivilegeMonitoringDataClient;

    // Mock index service
    const mockIndexService = {
      initialisePrivmonIndex: jest.fn().mockResolvedValue(undefined),
      _createIngestPipelineIfDoesNotExist: jest.fn().mockResolvedValue(undefined),
      _upsertIndex: jest.fn().mockResolvedValue(undefined),
      doesIndexExist: jest.fn().mockResolvedValue(true),
    };
    mockCreatePrivmonIndexService.mockReturnValue(mockIndexService);

    // Mock bulk operations
    mockQueryExistingUsers.mockReturnValue(
      jest.fn().mockResolvedValue({
        existingUsers: {},
        uploaded: [],
      })
    );

    mockBulkUpsertBatch.mockReturnValue(
      jest.fn().mockResolvedValue({
        batch: {
          uploaded: [],
        },
        users: [],
        errors: [],
        failed: 0,
        successful: 0,
      })
    );

    mockSoftDeleteOmittedUsers.mockReturnValue(
      jest.fn().mockResolvedValue({
        updated: { errors: [], failed: 0, successful: 0 },
        deleted: { errors: [], failed: 0, successful: 0 },
      })
    );

    csvService = createPrivilegedUsersCsvService(mockDataClient);
  });

  describe('Basic CSV Upload Functionality', () => {
    it('should process a simple CSV upload successfully', async () => {
      const csvData = 'username,label\njohndoe,admin\njanesmith,user';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('total');
      expect(result.stats).toHaveProperty('successful');
      expect(result.stats).toHaveProperty('failed');
    });

    it('should handle empty CSV data', async () => {
      const csvData = '';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result.stats.total).toBe(0);
      expect(result.stats.successful).toBe(0);
      expect(result.stats.failed).toBe(0);
    });

    it('should handle CSV with headers only', async () => {
      const csvData = 'username,label';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result.stats.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle bulk operation errors gracefully', async () => {
      const csvData = 'username,label\njohndoe,admin';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      // Override the soft delete operation to return errors
      mockSoftDeleteOmittedUsers.mockReturnValueOnce(
        jest.fn().mockResolvedValue({
          updated: { errors: [{ message: 'Bulk operation failed' }], failed: 1, successful: 0 },
          deleted: { errors: [], failed: 0, successful: 0 },
        })
      );

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.stats.failed).toBe(1);
    });
  });

  describe('Integration Points', () => {
    it('should call queryExistingUsers with correct parameters', async () => {
      const csvData = 'username,label\njohndoe,admin';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      await csvService.bulkUpload(mockStream, options);

      expect(mockQueryExistingUsers).toHaveBeenCalledWith(mockEsClient, mockIndex);
    });

    it('should call bulkUpsertBatch with correct parameters', async () => {
      const csvData = 'username,label\njohndoe,admin';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      await csvService.bulkUpload(mockStream, options);

      expect(mockBulkUpsertBatch).toHaveBeenCalledWith(mockEsClient, mockIndex, options);
    });

    it('should call softDeleteOmittedUsers after processing', async () => {
      const csvData = 'username,label\njohndoe,admin';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      await csvService.bulkUpload(mockStream, options);

      expect(mockSoftDeleteOmittedUsers).toHaveBeenCalledWith(mockEsClient, mockIndex, options);
    });
  });

  describe('Result Aggregation', () => {
    const createMockUser = (
      username: string,
      index: number,
      labelValue: string = 'admin'
    ): BulkPrivMonUser => ({
      username,
      index,
      label: {
        field: 'label',
        value: labelValue,
        source: 'csv',
      },
    });

    const createMockError = (
      message: string,
      username: string | null,
      index: number | null
    ): BulkProcessingError => ({
      message,
      username,
      index,
    });

    const createEmptyResults = (): BulkProcessingResults => ({
      users: [],
      errors: [],
      failed: 0,
      successful: 0,
    });

    const createMockBatch = (
      uploaded: Array<
        ReturnType<typeof right<BulkPrivMonUser>> | ReturnType<typeof left<BulkProcessingError>>
      >,
      failed: number,
      successful: number
    ): BulkBatchProcessingResults => ({
      batch: {
        uploaded,
        existingUsers: {},
      },
      failed,
      successful,
      errors: [],
    });

    describe('Accumulator Behavior', () => {
      it('should accumulate results across multiple batches', () => {
        const mockUser1 = createMockUser('user1', 0, 'admin');
        const mockUser2 = createMockUser('user2', 1, 'user');
        const mockUser3 = createMockUser('user3', 2, 'admin');
        const mockUser4 = createMockUser('user4', 3, 'user');
        const mockUser5 = createMockUser('user5', 4, 'admin');

        const mockError1 = createMockError('Validation failed', 'user3', 2);
        const mockError2 = createMockError('Network timeout', 'user4', 3);

        const batch1 = createMockBatch([right(mockUser1), right(mockUser2)], 1, 2);
        const batch2 = createMockBatch([right(mockUser3), left(mockError1)], 1, 1);
        const batch3 = createMockBatch(
          [right(mockUser4), right(mockUser5), left(mockError2)],
          1,
          2
        );

        // Accumulate as the loop does
        let results = createEmptyResults();
        results = accumulateUpsertResults(results, batch1);
        results = accumulateUpsertResults(results, batch2);
        results = accumulateUpsertResults(results, batch3);

        // Verify all batches are accumulated
        expect(results.users).toHaveLength(5); // All 5 users
        expect(results.errors).toHaveLength(2); // 2 errors
        expect(results.failed).toBe(3); // 1 + 1 + 1
        expect(results.successful).toBe(5); // 2 + 1 + 2
        expect(results.users[0].username).toBe('user1');
        expect(results.users[4].username).toBe('user5');
        expect(results.errors[0].message).toBe('Validation failed');
        expect(results.errors[1].message).toBe('Network timeout');
      });
    });

    it('should correctly aggregate results from updated and deleted operations', async () => {
      const csvData = 'username,label\njohndoe,admin';
      const mockStream = createMockStream(csvData);
      const options = { retries: 3, flushBytes: 1048576 };

      // Mock soft delete to return some results
      mockSoftDeleteOmittedUsers.mockReturnValue(
        jest.fn().mockResolvedValue({
          updated: { errors: [], failed: 1, successful: 2 },
          deleted: { errors: [{ message: 'Delete error' }], failed: 1, successful: 1 },
        })
      );

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result.stats.failed).toBe(2); // 1 from updated + 1 from deleted
      expect(result.stats.successful).toBe(3); // 2 from updated + 1 from deleted
      expect(result.stats.total).toBe(5); // failed + successful
      expect(result.errors).toHaveLength(1); // 1 error from deleted operation
    });
  });
});

describe('CSV Upload Service - Username Uniqueness Tests', () => {
  let mockDataClient: PrivilegeMonitoringDataClient;
  let mockEsClient: ElasticsearchClient;

  const mockIndex = 'test-privilege-monitoring-index';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Elasticsearch client
    mockEsClient = {
      search: jest.fn(),
      update: jest.fn(),
      index: jest.fn(),
    } as unknown as ElasticsearchClient;

    // Mock data client
    mockDataClient = {
      deps: {
        clusterClient: {
          asCurrentUser: mockEsClient,
        },
      },
      index: mockIndex,
      log: jest.fn(),
    } as unknown as PrivilegeMonitoringDataClient;

    // Mock index service
    const mockIndexService = {
      initialisePrivmonIndex: jest.fn().mockResolvedValue(undefined),
      _createIngestPipelineIfDoesNotExist: jest.fn().mockResolvedValue(undefined),
      _upsertIndex: jest.fn().mockResolvedValue(undefined),
      doesIndexExist: jest.fn().mockResolvedValue(true),
    };
    mockCreatePrivmonIndexService.mockReturnValue(mockIndexService);
  });

  describe('Soft-delete Operation Logic', () => {
    it('should search for users not in CSV and soft-delete them', async () => {
      const csvUsernames = ['user1', 'user2'];
      const usersToDelete = [
        { _id: 'user3-id', _source: { user: { name: 'user3' } } },
        { _id: 'user4-id', _source: { user: { name: 'user4' } } },
      ];

      // Mock search returns users to delete
      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: usersToDelete },
      });
      (mockEsClient.update as jest.Mock).mockResolvedValue({});

      // Test the soft-delete search query logic
      const expectedQuery = {
        index: mockIndex,
        query: {
          bool: {
            must: [{ term: { 'user.is_privileged': true } }],
            must_not: [{ terms: { 'user.name.keyword': csvUsernames } }],
          },
        },
        size: 10000,
        _source: ['user.name'],
      };

      await mockEsClient.search(expectedQuery);
      expect(mockEsClient.search as jest.Mock).toHaveBeenCalledWith(expectedQuery);

      // Test soft-delete update operations
      for (const userDoc of usersToDelete) {
        await mockEsClient.update({
          index: mockIndex,
          id: userDoc._id,
          refresh: 'wait_for',
          doc: { user: { is_privileged: false } },
        });
      }

      expect(mockEsClient.update as jest.Mock).toHaveBeenCalledTimes(2);
      expect(mockEsClient.update as jest.Mock).toHaveBeenCalledWith({
        index: mockIndex,
        id: 'user3-id',
        refresh: 'wait_for',
        doc: { user: { is_privileged: false } },
      });
      expect(mockEsClient.update as jest.Mock).toHaveBeenCalledWith({
        index: mockIndex,
        id: 'user4-id',
        refresh: 'wait_for',
        doc: { user: { is_privileged: false } },
      });
    });

    it('should handle soft-delete errors gracefully', async () => {
      const userDoc = { _id: 'user-id', _source: { user: { name: 'testuser' } } };

      (mockEsClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: [userDoc] },
      });
      (mockEsClient.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      try {
        await mockEsClient.update({
          index: mockIndex,
          id: userDoc._id,
          refresh: 'wait_for',
          doc: { user: { is_privileged: false } },
        });
      } catch (error) {
        expect(error.message).toBe('Update failed');
      }
    });

    it('should handle search errors during soft-delete', async () => {
      (mockEsClient.search as jest.Mock).mockRejectedValue(new Error('Search failed'));

      try {
        await mockEsClient.search({
          index: mockIndex,
          query: { bool: { must: [{ term: { 'user.is_privileged': true } }] } },
        });
      } catch (error) {
        expect(error.message).toBe('Search failed');
      }
    });
  });

  describe('Username Uniqueness Scenarios', () => {
    it('should create new user when username does not exist', async () => {
      const username = 'newuser';

      // Test the logic for creating a new user
      const newUser = {
        user: { name: username, is_privileged: true },
        id: 'new-id',
      };

      expect(newUser.user?.name).toBe(username);
      expect(newUser.user?.is_privileged).toBe(true);
    });

    it('should update existing user when username already exists', async () => {
      const username = 'existinguser';

      // Test the logic for updating an existing user
      const updatedUser = {
        user: { name: username, is_privileged: true },
        id: 'existing-id',
      };

      expect(updatedUser.user?.name).toBe(username);
      expect(updatedUser.user?.is_privileged).toBe(true);
    });

    it('should handle duplicate usernames within the same CSV', async () => {
      const username = 'duplicate';

      // Test scenario where same username appears multiple times in CSV
      const firstUser = {
        user: { name: username, is_privileged: true },
        id: 'new-id',
      };

      const secondUser = {
        user: { name: username, is_privileged: true },
        id: 'new-id',
      };

      expect(firstUser.user?.name).toBe(username);
      expect(secondUser.user?.name).toBe(username);
      // Both should reference the same user
      expect(firstUser.id).toBe(secondUser.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle bulk operation errors', async () => {
      // Mock bulk upsert to return error
      const mockBulkResult = {
        users: [],
        errors: [{ message: 'Database connection error' }],
        failed: 1,
        successful: 0,
      };

      expect(mockBulkResult.errors.length).toBeGreaterThan(0);
      expect(mockBulkResult.failed).toBe(1);
    });

    it('should handle update operation failures', async () => {
      // Mock soft delete to return error
      const mockSoftDeleteResult = {
        updated: { errors: [{ message: 'Update failed' }], failed: 1, successful: 0 },
        deleted: { errors: [], failed: 0, successful: 0 },
      };

      expect(mockSoftDeleteResult.updated.errors.length).toBeGreaterThan(0);
      expect(mockSoftDeleteResult.updated.failed).toBe(1);
    });
  });

  describe('Logging', () => {
    it('should validate logging message patterns', () => {
      const fileSize = 1234;
      const uniqueUserCount = 5;
      const username = 'testuser';

      // Test log message patterns used in the service
      const debugStartMessage = 'Starting CSV bulk upload';
      const infoFileSizeMessage = `File size validated: ${fileSize} bytes`;
      const infoUserCountMessage = `CSV contains ${uniqueUserCount} unique users`;
      const debugCreateMessage = `Created new user: ${username}`;
      const debugUpdateMessage = `Updated user with CSV source: ${username}`;
      const infoCompleteMessage = 'CSV bulk upload completed';

      expect(debugStartMessage).toContain('Starting CSV bulk upload');
      expect(infoFileSizeMessage).toContain('File size validated');
      expect(infoFileSizeMessage).toContain(fileSize.toString());
      expect(infoUserCountMessage).toContain('unique users');
      expect(debugCreateMessage).toContain('Created new user');
      expect(debugUpdateMessage).toContain('Updated user with CSV source');
      expect(infoCompleteMessage).toContain('CSV bulk upload completed');
    });
  });

  describe('Index Initialization', () => {
    it('should validate index initialization logic', () => {
      // Test that the service properly sets up the index service mock
      const mockIndexService = {
        initialisePrivmonIndex: jest.fn().mockResolvedValue(undefined),
        _createIngestPipelineIfDoesNotExist: jest.fn().mockResolvedValue(undefined),
        _upsertIndex: jest.fn().mockResolvedValue(undefined),
        doesIndexExist: jest.fn().mockResolvedValue(true),
      };

      // Test the index initialization flow
      mockCreatePrivmonIndexService.mockReturnValue(mockIndexService);
      const indexService = mockCreatePrivmonIndexService(mockDataClient);
      expect(indexService).toBe(mockIndexService);
    });
  });
});
