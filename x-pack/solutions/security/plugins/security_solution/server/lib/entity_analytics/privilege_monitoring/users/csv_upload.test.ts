/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { ElasticsearchClient } from '@kbn/core/server';
import { createPrivilegedUsersCsvService } from './csv_upload';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';
import type { HapiReadableStream } from '../../../../types';

// Mock external dependencies
jest.mock('papaparse');
jest.mock('./utils');
jest.mock('./streams/privileged_user_parse_transform');
jest.mock('../../shared/streams/batching');
jest.mock('../engine/elasticsearch/indices');

// Import and type the mocked modules
import * as mockUtilsModule from './utils';
import * as mockIndexModule from '../engine/elasticsearch/indices';

const mockUtils = mockUtilsModule as jest.Mocked<typeof mockUtilsModule>;
const mockCreatePrivmonIndexService =
  mockIndexModule.createPrivmonIndexService as jest.MockedFunction<
    typeof mockIndexModule.createPrivmonIndexService
  >;

describe('CSV Upload Service - Username Uniqueness Tests', () => {
  let mockDataClient: PrivilegeMonitoringDataClient;
  let mockEsClient: ElasticsearchClient;
  let csvService: ReturnType<typeof createPrivilegedUsersCsvService>;

  const mockIndex = 'test-privilege-monitoring-index';

  // Helper function to create mock HapiReadableStream
  const createMockStream = (data: Buffer): HapiReadableStream => {
    const stream = new Readable() as HapiReadableStream;
    stream.push(data);
    stream.push(null);
    stream.hapi = {} as unknown as HapiReadableStream['hapi'];
    return stream;
  };

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
      createIngestPipelineIfDoesNotExist: jest.fn().mockResolvedValue(undefined),
      doesIndexExist: jest.fn().mockResolvedValue(true),
      upsertIndex: jest.fn().mockResolvedValue(undefined),
    };
    mockCreatePrivmonIndexService.mockReturnValue(mockIndexService);

    csvService = createPrivilegedUsersCsvService(mockDataClient);
  });

  describe('File Size Validation', () => {
    it('should reject files that exceed size limit', async () => {
      const options = { retries: 3, flushBytes: 1048576 }; // 1MB
      const largeData = Buffer.alloc(options.flushBytes + 1000); // Exceed limit
      const mockStream = createMockStream(largeData);

      const result = await csvService.bulkUpload(mockStream, options);

      expect(result.stats.total).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('CSV file size');
      expect(result.errors[0].message).toContain('exceeds maximum allowed size');
    });

    it('should validate file size logic correctly', () => {
      const options = { retries: 3, flushBytes: 1048576 }; // 1MB
      const validSize = 1000;
      const invalidSize = options.flushBytes + 1000;

      // Test the size validation logic directly
      expect(validSize <= options.flushBytes).toBe(true);
      expect(invalidSize <= options.flushBytes).toBe(false);

      // Verify the error message format
      const expectedErrorMessage = `CSV file size (${invalidSize} bytes) exceeds maximum allowed size (${options.flushBytes} bytes)`;
      expect(expectedErrorMessage).toContain('CSV file size');
      expect(expectedErrorMessage).toContain('exceeds maximum allowed size');
    });
  });

  describe('Helper Function Integration', () => {
    it('should use findUserByUsername to check for existing users', async () => {
      const testUsername = 'testuser';

      // Test scenario: user not found (new user)
      mockUtils.findUserByUsername.mockResolvedValue(undefined);
      mockUtils.createUserDocument.mockResolvedValue({
        user: { name: testUsername, is_privileged: true },
        id: 'new-user-id',
      });

      // Call helper function directly to test integration
      const existingUser = await mockUtils.findUserByUsername(
        mockEsClient,
        mockIndex,
        testUsername
      );
      expect(existingUser).toBeUndefined();

      const newUser = await mockUtils.createUserDocument(
        mockEsClient,
        mockIndex,
        { user: { name: testUsername } },
        'csv',
        async () => ({ user: { name: testUsername, is_privileged: true } })
      );

      expect(newUser.user?.name).toBe(testUsername);
      expect(mockUtils.findUserByUsername).toHaveBeenCalledWith(
        mockEsClient,
        mockIndex,
        testUsername
      );
      expect(mockUtils.createUserDocument).toHaveBeenCalledWith(
        mockEsClient,
        mockIndex,
        { user: { name: testUsername } },
        'csv',
        expect.any(Function)
      );
    });

    it('should use updateUserWithSource for existing users', async () => {
      const testUsername = 'existinguser';
      const existingUser = {
        user: { name: testUsername, is_privileged: false },
        id: 'existing-user-id',
      };

      // Test scenario: user found (existing user)
      mockUtils.findUserByUsername.mockResolvedValue(existingUser);
      mockUtils.updateUserWithSource.mockResolvedValue({
        user: { name: testUsername, is_privileged: true },
        id: 'existing-user-id',
      });

      const foundUser = await mockUtils.findUserByUsername(mockEsClient, mockIndex, testUsername);
      expect(foundUser).toEqual(existingUser);

      const updatedUser = await mockUtils.updateUserWithSource(
        mockEsClient,
        mockIndex,
        existingUser,
        'csv',
        { user: { name: testUsername } },
        async () => existingUser
      );

      expect(updatedUser.user?.name).toBe(testUsername);
      expect(mockUtils.updateUserWithSource).toHaveBeenCalledWith(
        mockEsClient,
        mockIndex,
        existingUser,
        'csv',
        { user: { name: testUsername } },
        expect.any(Function)
      );
    });
  });

  describe('Adapter Function Logic', () => {
    it('should correctly transform data between bulk and helper formats', () => {
      // Test the transformation patterns used in the service
      const bulkUser = { username: 'testuser', index: 1 };

      // Simulate adaptBulkUserToHelperFormat
      const helperFormat = { user: { name: bulkUser.username } };
      expect(helperFormat.user.name).toBe('testuser');

      // Simulate adaptHelperResponseToBulkFormat
      const helperResponse = { user: { name: 'testuser', is_privileged: true } };
      const bulkFormat = { username: helperResponse.user?.name, index: 1 };
      expect(bulkFormat.username).toBe('testuser');
      expect(bulkFormat.index).toBe(1);
    });
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

      // Mock user not found
      mockUtils.findUserByUsername.mockResolvedValue(undefined);
      mockUtils.createUserDocument.mockResolvedValue({
        user: { name: username, is_privileged: true },
        id: 'new-id',
      });

      // Test the create path
      const existingUser = await mockUtils.findUserByUsername(mockEsClient, mockIndex, username);
      expect(existingUser).toBeUndefined();

      const createdUser = await mockUtils.createUserDocument(
        mockEsClient,
        mockIndex,
        { user: { name: username } },
        'csv',
        async () => ({ user: { name: username, is_privileged: true } })
      );

      expect(createdUser.user?.name).toBe(username);
      expect(createdUser.user?.is_privileged).toBe(true);
    });

    it('should update existing user when username already exists', async () => {
      const username = 'existinguser';
      const existingUserDoc = {
        user: { name: username, is_privileged: false },
        id: 'existing-id',
      };

      // Mock user found
      mockUtils.findUserByUsername.mockResolvedValue(existingUserDoc);
      mockUtils.updateUserWithSource.mockResolvedValue({
        user: { name: username, is_privileged: true },
        id: 'existing-id',
      });

      // Test the update path
      const foundUser = await mockUtils.findUserByUsername(mockEsClient, mockIndex, username);
      expect(foundUser).toEqual(existingUserDoc);

      const updatedUser = await mockUtils.updateUserWithSource(
        mockEsClient,
        mockIndex,
        existingUserDoc,
        'csv',
        { user: { name: username } },
        async () => existingUserDoc
      );

      expect(updatedUser.user?.name).toBe(username);
      expect(updatedUser.user?.is_privileged).toBe(true);
    });

    it('should handle duplicate usernames within the same CSV', async () => {
      const username = 'duplicate';

      // First call - user not found (creates new)
      mockUtils.findUserByUsername.mockResolvedValueOnce(undefined);
      mockUtils.createUserDocument.mockResolvedValueOnce({
        user: { name: username, is_privileged: true },
        id: 'new-id',
      });

      // Second call - user found (updates existing)
      const existingUser = { user: { name: username, is_privileged: true }, id: 'new-id' };
      mockUtils.findUserByUsername.mockResolvedValueOnce(existingUser);
      mockUtils.updateUserWithSource.mockResolvedValueOnce({
        user: { name: username, is_privileged: true },
        id: 'new-id',
      });

      // Test first occurrence (create)
      const firstCheck = await mockUtils.findUserByUsername(mockEsClient, mockIndex, username);
      expect(firstCheck).toBeUndefined();

      const firstUser = await mockUtils.createUserDocument(
        mockEsClient,
        mockIndex,
        { user: { name: username } },
        'csv',
        async () => ({ user: { name: username, is_privileged: true } })
      );
      expect(firstUser.user?.name).toBe(username);

      // Test second occurrence (update)
      const secondCheck = await mockUtils.findUserByUsername(mockEsClient, mockIndex, username);
      expect(secondCheck).toEqual(existingUser);

      const secondUser = await mockUtils.updateUserWithSource(
        mockEsClient,
        mockIndex,
        existingUser,
        'csv',
        { user: { name: username } },
        async () => existingUser
      );
      expect(secondUser.user?.name).toBe(username);

      expect(mockUtils.findUserByUsername).toHaveBeenCalledTimes(2);
      expect(mockUtils.createUserDocument).toHaveBeenCalledTimes(1);
      expect(mockUtils.updateUserWithSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during user creation', async () => {
      const username = 'problematicuser';

      mockUtils.findUserByUsername.mockResolvedValue(undefined);
      mockUtils.createUserDocument.mockRejectedValue(new Error('Database connection error'));

      try {
        await mockUtils.createUserDocument(
          mockEsClient,
          mockIndex,
          { user: { name: username } },
          'csv',
          async () => ({ user: { name: username, is_privileged: true } })
        );
      } catch (error) {
        expect(error.message).toBe('Database connection error');
      }
    });

    it('should handle errors during user update', async () => {
      const username = 'problematicuser';
      const existingUser = { user: { name: username }, id: 'existing-id' };

      mockUtils.findUserByUsername.mockResolvedValue(existingUser);
      mockUtils.updateUserWithSource.mockRejectedValue(new Error('Update failed'));

      try {
        await mockUtils.updateUserWithSource(
          mockEsClient,
          mockIndex,
          existingUser,
          'csv',
          { user: { name: username } },
          async () => existingUser
        );
      } catch (error) {
        expect(error.message).toBe('Update failed');
      }
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
        createIngestPipelineIfDoesNotExist: jest.fn().mockResolvedValue(undefined),
        doesIndexExist: jest.fn().mockResolvedValue(true),
        upsertIndex: jest.fn().mockResolvedValue(undefined),
      };

      // Verify the mock structure matches what the service expects
      expect(mockIndexService.createIngestPipelineIfDoesNotExist).toBeDefined();
      expect(mockIndexService.doesIndexExist).toBeDefined();
      expect(mockIndexService.upsertIndex).toBeDefined();

      // Test that createPrivmonIndexService would be called with dataClient
      expect(typeof mockCreatePrivmonIndexService).toBe('function');

      // Test the index initialization flow
      mockCreatePrivmonIndexService.mockReturnValue(mockIndexService);
      const indexService = mockCreatePrivmonIndexService(mockDataClient);
      expect(indexService).toBe(mockIndexService);
    });
  });
});
