/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import {
  getOpenAndAcknowledgedAlertsQuery,
  getRawDataOrDefault,
  transformRawData,
  securityAlertReference,
  contentReferenceBlock,
} from '@kbn/elastic-assistant-common';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import { openAndAcknowledgedAlertsInternalTool } from './open_and_acknowledged_alerts_internal_tool';

// Mock dependencies
jest.mock('@kbn/elastic-assistant-common', () => ({
  getOpenAndAcknowledgedAlertsQuery: jest.fn(),
  getRawDataOrDefault: jest.fn(),
  transformRawData: jest.fn(),
  securityAlertReference: jest.fn(),
  contentReferenceBlock: jest.fn(),
}));

jest.mock('@kbn/elastic-assistant-plugin/server/lib/langchain/helpers', () => ({
  requestHasRequiredAnonymizationParams: jest.fn(),
}));

describe('openAndAcknowledgedAlertsInternalTool', () => {
  const mockEsClient = elasticsearchClientMock.createScopedClusterClient();
  const mockRequest = {} as KibanaRequest;
  const mockOnNewReplacements = jest.fn();
  const mockReplacements: Replacements = {};
  const mockContentReferencesStore = {
    add: jest.fn(),
  };

  const mockToolParams = {
    alertsIndexPattern: '.alerts-security.alerts-default',
    size: 10,
    anonymizationFields: [],
  };

  const mockContext = {
    esClient: mockEsClient,
    request: mockRequest,
    onNewReplacements: mockOnNewReplacements,
    replacements: mockReplacements,
    contentReferencesStore: mockContentReferencesStore,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (requestHasRequiredAnonymizationParams as jest.Mock).mockReturnValue(true);
    (getOpenAndAcknowledgedAlertsQuery as jest.Mock).mockReturnValue({ query: 'mock-query' });
    (getRawDataOrDefault as jest.Mock).mockReturnValue({ field1: 'value1' });
    (transformRawData as jest.Mock).mockReturnValue('transformed-data');
    (securityAlertReference as jest.Mock).mockReturnValue({ id: 'ref-1' });
    (contentReferenceBlock as jest.Mock).mockReturnValue('citation-block');
  });

  describe('tool definition', () => {
    it('should return a valid InternalToolDefinition', () => {
      const tool = openAndAcknowledgedAlertsInternalTool();

      expect(tool).toMatchObject({
        id: 'open-and-acknowledged-alerts-internal-tool',
        type: 'builtin',
        description: expect.any(String),
        schema: expect.any(Object),
        handler: expect.any(Function),
        tags: ['alerts', 'open-and-acknowledged-alerts', 'security'],
      });
    });

    it('should have correct schema validation', () => {
      const tool = openAndAcknowledgedAlertsInternalTool();
      const { schema } = tool;

      // Valid params should pass
      expect(() => schema.parse(mockToolParams)).not.toThrow();

      // Invalid size should fail
      expect(() => schema.parse({ ...mockToolParams, size: 0 })).toThrow();
      expect(() => schema.parse({ ...mockToolParams, size: 1001 })).toThrow();

      // Missing required fields should fail
      expect(() => schema.parse({ size: 10 })).toThrow();
      expect(() => schema.parse({ alertsIndexPattern: 'test' })).toThrow();
    });
  });

  describe('handler', () => {
    it('should execute successfully with valid parameters', async () => {
      const mockSearchResponse: SearchResponse = {
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: 'test-index',
              fields: { field1: ['value1'] },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue(mockSearchResponse);

      const tool = openAndAcknowledgedAlertsInternalTool();
      const result = await tool.handler(mockToolParams, mockContext);

      expect(getOpenAndAcknowledgedAlertsQuery).toHaveBeenCalledWith({
        alertsIndexPattern: mockToolParams.alertsIndexPattern,
        anonymizationFields: mockToolParams.anonymizationFields,
        size: mockToolParams.size,
      });

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith({ query: 'mock-query' });

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.text,
            data: JSON.stringify(['transformed-datacitation-block']),
          },
        ],
      });
    });

    it('should throw error when request lacks required anonymization parameters', async () => {
      (requestHasRequiredAnonymizationParams as jest.Mock).mockReturnValue(false);

      const tool = openAndAcknowledgedAlertsInternalTool();

      await expect(tool.handler(mockToolParams, mockContext)).rejects.toThrow(
        'Request missing required anonymization parameters'
      );
    });

    it('should throw error when size is out of range', async () => {
      const tool = openAndAcknowledgedAlertsInternalTool();

      await expect(tool.handler({ ...mockToolParams, size: 1001 }, mockContext)).rejects.toThrow(
        'Size 1001 is out of range'
      );
    });

    it('should handle empty search results', async () => {
      const mockEmptyResponse: SearchResponse = {
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue(mockEmptyResponse);

      const tool = openAndAcknowledgedAlertsInternalTool();
      const result = await tool.handler(mockToolParams, mockContext);

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.text,
            data: JSON.stringify([]),
          },
        ],
      });
    });

    it('should handle missing hit ID gracefully', async () => {
      const mockSearchResponse: SearchResponse = {
        hits: {
          hits: [
            {
              _index: 'test-index',
              fields: { field1: ['value1'] },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      };

      mockEsClient.asCurrentUser.search.mockResolvedValue(mockSearchResponse);

      const tool = openAndAcknowledgedAlertsInternalTool();
      const result = await tool.handler(mockToolParams, mockContext);

      expect(result).toEqual({
        results: [
          {
            type: ToolResultType.text,
            data: JSON.stringify(['transformed-data']),
          },
        ],
      });
    });
  });
});
