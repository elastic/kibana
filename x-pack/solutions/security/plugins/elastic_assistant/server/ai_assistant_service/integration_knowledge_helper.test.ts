/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { IndexEntryType } from '@kbn/elastic-assistant-common';
import type { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import {
  checkIntegrationKnowledgeIndexEntryExists,
  ensureIntegrationKnowledgeIndexEntry,
} from './integration_knowledge_helper';

describe('Integration Knowledge Helper', () => {
  let mockKbDataClient: jest.Mocked<AIAssistantKnowledgeBaseDataClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockTelemetry: jest.Mocked<AnalyticsServiceSetup>;

  beforeEach(() => {
    mockKbDataClient = {
      findDocuments: jest.fn(),
      createKnowledgeBaseEntry: jest.fn(),
    } as unknown as jest.Mocked<AIAssistantKnowledgeBaseDataClient>;

    mockLogger = loggingSystemMock.createLogger();

    mockTelemetry = {
      reportEvent: jest.fn(),
    } as unknown as jest.Mocked<AnalyticsServiceSetup>;

    jest.clearAllMocks();
  });

  describe('checkIntegrationKnowledgeIndexEntryExists', () => {
    it('should return true when integration knowledge index entry exists', async () => {
      const mockResults = {
        total: 1,
        data: [
          {
            id: 'test-id',
            type: IndexEntryType.value,
            index: '.integration_knowledge',
            field: 'content',
            name: 'Integration Knowledge',
          },
        ],
      };

      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockResults);

      const result = await checkIntegrationKnowledgeIndexEntryExists({
        kbDataClient: mockKbDataClient,
        logger: mockLogger,
      });

      expect(result).toBe(true);
      expect(mockKbDataClient.findDocuments).toHaveBeenCalledWith({
        page: 1,
        perPage: 1,
        filter: 'type:index AND index:.integration_knowledge',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Integration knowledge index entry exists: true'
      );
    });

    it('should return false when integration knowledge index entry does not exist', async () => {
      const mockResults = {
        total: 0,
        data: [],
      };

      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockResults);

      const result = await checkIntegrationKnowledgeIndexEntryExists({
        kbDataClient: mockKbDataClient,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockKbDataClient.findDocuments).toHaveBeenCalledWith({
        page: 1,
        perPage: 1,
        filter: 'type:index AND index:.integration_knowledge',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Integration knowledge index entry exists: false'
      );
    });

    it('should return false and log error when findDocuments throws an error', async () => {
      const errorMessage = 'Database connection failed';
      (mockKbDataClient.findDocuments as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const result = await checkIntegrationKnowledgeIndexEntryExists({
        kbDataClient: mockKbDataClient,
        logger: mockLogger,
      });

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error checking integration knowledge index entry: ${errorMessage}`
      );
    });
  });

  describe('ensureIntegrationKnowledgeIndexEntry', () => {
    it('should return true when integration knowledge index entry already exists', async () => {
      const mockResults = {
        total: 1,
        data: [
          {
            id: 'existing-id',
            type: IndexEntryType.value,
            index: '.integration_knowledge',
          },
        ],
      };

      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockResults);

      const result = await ensureIntegrationKnowledgeIndexEntry(
        mockKbDataClient,
        mockLogger,
        mockTelemetry
      );

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Checking if integration knowledge index entry exists...'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Integration knowledge index entry already exists'
      );
      expect(mockKbDataClient.createKnowledgeBaseEntry).not.toHaveBeenCalled();
    });

    it('should create integration knowledge index entry when it does not exist', async () => {
      const mockFindResults = {
        total: 0,
        data: [],
      };

      const mockCreatedEntry = {
        id: 'new-entry-id',
        type: IndexEntryType.value,
        index: '.integration_knowledge',
        field: 'content',
        name: 'Integration Knowledge',
        description:
          'Integration knowledge base containing semantic information about integrations installed via Fleet. Use this tool to search for information about integrations, integration configurations, troubleshooting guides, and best practices',
        queryDescription:
          'Key terms to retrieve relevant integration details, like integration name, configuration values the user is having issues with, and/or any other general keywords',
        global: true,
        users: [],
      };

      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockFindResults);
      (mockKbDataClient.createKnowledgeBaseEntry as jest.Mock).mockResolvedValue(mockCreatedEntry);

      const result = await ensureIntegrationKnowledgeIndexEntry(
        mockKbDataClient,
        mockLogger,
        mockTelemetry
      );

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Checking if integration knowledge index entry exists...'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Creating integration knowledge index entry...'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Integration knowledge index entry created successfully'
      );

      expect(mockKbDataClient.createKnowledgeBaseEntry).toHaveBeenCalledWith({
        knowledgeBaseEntry: {
          type: IndexEntryType.value,
          index: '.integration_knowledge',
          field: 'content',
          name: 'Integration Knowledge',
          description:
            'Integration knowledge base containing semantic information about integrations installed via Fleet. Use this tool to search for information about integrations, integration configurations, troubleshooting guides, and best practices',
          queryDescription:
            'Key terms to retrieve relevant integration details, like integration name, configuration values the user is having issues with, and/or any other general keywords',
          global: true,
          users: [],
        },
        telemetry: mockTelemetry,
      });
    });

    it('should return false and log error when createKnowledgeBaseEntry returns null', async () => {
      const mockFindResults = {
        total: 0,
        data: [],
      };

      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockFindResults);
      (mockKbDataClient.createKnowledgeBaseEntry as jest.Mock).mockResolvedValue(null);

      const result = await ensureIntegrationKnowledgeIndexEntry(
        mockKbDataClient,
        mockLogger,
        mockTelemetry
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create integration knowledge index entry'
      );
    });

    it('should return false and log error when createKnowledgeBaseEntry throws an error', async () => {
      const mockFindResults = {
        total: 0,
        data: [],
      };

      const errorMessage = 'Failed to create entry';
      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockFindResults);
      (mockKbDataClient.createKnowledgeBaseEntry as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      const result = await ensureIntegrationKnowledgeIndexEntry(
        mockKbDataClient,
        mockLogger,
        mockTelemetry
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error ensuring integration knowledge index entry: ${errorMessage}`
      );
    });

    it('should return false and log error when checkIntegrationKnowledgeIndexEntryExists throws an error', async () => {
      const errorMessage = 'Check failed';
      (mockKbDataClient.findDocuments as jest.Mock).mockRejectedValue(new Error(errorMessage));

      const result = await ensureIntegrationKnowledgeIndexEntry(
        mockKbDataClient,
        mockLogger,
        mockTelemetry
      );

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error checking integration knowledge index entry: ${errorMessage}`
      );
    });

    it('should use correct knowledge base entry configuration', async () => {
      const mockFindResults = {
        total: 0,
        data: [],
      };

      const mockCreatedEntry = { id: 'test-id' };
      (mockKbDataClient.findDocuments as jest.Mock).mockResolvedValue(mockFindResults);
      (mockKbDataClient.createKnowledgeBaseEntry as jest.Mock).mockResolvedValue(mockCreatedEntry);

      await ensureIntegrationKnowledgeIndexEntry(mockKbDataClient, mockLogger, mockTelemetry);

      const createCall = (mockKbDataClient.createKnowledgeBaseEntry as jest.Mock).mock.calls[0][0];
      const knowledgeBaseEntry = createCall.knowledgeBaseEntry;

      expect(knowledgeBaseEntry.type).toBe(IndexEntryType.value);
      expect(knowledgeBaseEntry.name).toBe('Integration Knowledge');
      expect(knowledgeBaseEntry.global).toBe(true);
      expect(knowledgeBaseEntry.users).toEqual([]);

      // Type guard to check if it's an index entry
      if (knowledgeBaseEntry.type === IndexEntryType.value) {
        expect(knowledgeBaseEntry.index).toBe('.integration_knowledge');
        expect(knowledgeBaseEntry.field).toBe('content');
        expect(knowledgeBaseEntry.description).toContain(
          'Integration knowledge base containing semantic information'
        );
        expect(knowledgeBaseEntry.queryDescription).toContain(
          'Key terms to retrieve relevant integration details'
        );
      }
      expect(createCall.telemetry).toBe(mockTelemetry);
    });
  });
});
