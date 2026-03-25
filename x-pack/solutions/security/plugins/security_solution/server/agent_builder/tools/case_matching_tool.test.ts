/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractEntitiesFromAlerts } from '@kbn/elastic-assistant-plugin/server';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { caseMatchingTool, CASE_MATCHING_TOOL_ID } from './case_matching_tool';

jest.mock('@kbn/elastic-assistant-plugin/server', () => ({
  extractEntitiesFromAlerts: jest.fn(),
  matchAlertsToCases: jest.fn(),
}));

describe('caseMatchingTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = caseMatchingTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct input', () => {
      const result = tool.schema.safeParse({ alert_ids: ['alert-1'] });
      expect(result.success).toBe(true);
    });

    it('validates input with optional match_threshold', () => {
      const result = tool.schema.safeParse({
        alert_ids: ['alert-1'],
        match_threshold: 0.5,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing alert_ids', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects threshold out of range', () => {
      const result = tool.schema.safeParse({
        alert_ids: ['a'],
        match_threshold: 2.0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(CASE_MATCHING_TOOL_ID);
    });

    it('has correct tags', () => {
      expect(tool.tags).toEqual(['security', 'alerts', 'cases', 'matching']);
    });

    it('has description mentioning cases', () => {
      expect(tool.description).toContain('case');
    });
  });

  describe('handler', () => {
    it('extracts entities from fetched alerts', async () => {
      const mockAlerts = [
        {
          _id: 'alert-1',
          _source: {
            'host.name': 'webserver-01',
            'source.ip': '10.0.0.5',
            'user.name': 'john',
          },
        },
      ];
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: mockAlerts, total: { value: 1, relation: 'eq' } },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [
          { typeKey: 'hostname', value: 'webserver-01', field: 'host.name', alertId: 'alert-1' },
          { typeKey: 'ipv4', value: '10.0.0.5', field: 'source.ip', alertId: 'alert-1' },
          { typeKey: 'user', value: 'john', field: 'user.name', alertId: 'alert-1' },
        ],
        stats: { totalFields: 20, fieldsWithValues: 3, entitiesExtracted: 3, entitiesAfterDedup: 3 },
      });

      const result = await tool.handler(
        { alert_ids: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(extractEntitiesFromAlerts).toHaveBeenCalledWith({
        alerts: expect.arrayContaining([expect.objectContaining({ _id: 'alert-1' })]),
        logger: mockLogger,
      });

      expect(result).toMatchObject({
        alert_entities: expect.objectContaining({
          hostname: ['webserver-01'],
          user: ['john'],
        }),
        total_entities: 3,
        recommendation: expect.stringContaining('Extracted 3 entities'),
      });
    });

    it('recommends manual assignment when no entities extracted', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'a1', _source: {} }], total: { value: 1, relation: 'eq' } },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [],
        stats: { totalFields: 20, fieldsWithValues: 0, entitiesExtracted: 0, entitiesAfterDedup: 0 },
      });

      const result = await tool.handler(
        { alert_ids: ['a1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.recommendation).toContain('Manual case assignment');
    });

    it('uses default threshold when not provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'a1', _source: {} }], total: { value: 1, relation: 'eq' } },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [],
        stats: { totalFields: 0, fieldsWithValues: 0, entitiesExtracted: 0, entitiesAfterDedup: 0 },
      });

      const result = await tool.handler(
        { alert_ids: ['a1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.match_threshold).toBe(0.3);
    });

    it('uses custom threshold when provided', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'a1', _source: {} }], total: { value: 1, relation: 'eq' } },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [],
        stats: { totalFields: 0, fieldsWithValues: 0, entitiesExtracted: 0, entitiesAfterDedup: 0 },
      });

      const result = await tool.handler(
        { alert_ids: ['a1'], match_threshold: 0.7 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.match_threshold).toBe(0.7);
    });

    it('uses correct index with spaceId', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [],
        stats: { totalFields: 0, fieldsWithValues: 0, entitiesExtracted: 0, entitiesAfterDedup: 0 },
      });

      await tool.handler(
        { alert_ids: ['a1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          spaceId: 'my-space',
        })
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-my-space',
        })
      );
    });
  });
});
