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
} from '../../../../__mocks__/test_helpers';
import { getCaseMatchingInlineTool, CASE_MATCHING_TOOL_ID } from './case_matching';

jest.mock('@kbn/elastic-assistant-plugin/server', () => ({
  extractEntitiesFromAlerts: jest.fn(),
}));

describe('caseMatchingInlineTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getCaseMatchingInlineTool();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct input', () => {
      const result = tool.schema.safeParse({ alert_ids: ['alert-1'] });
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

    it('has description mentioning cases', () => {
      expect(tool.description).toContain('case');
    });
  });

  describe('handler', () => {
    it('extracts entities from fetched alerts', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'alert-1', _source: { 'host.name': 'webserver-01' } }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [
          { typeKey: 'hostname', value: 'webserver-01', field: 'host.name', alertId: 'alert-1' },
        ],
        stats: { totalFields: 20, fieldsWithValues: 1, entitiesExtracted: 1, entitiesAfterDedup: 1 },
      });

      const result = await tool.handler(
        { alert_ids: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toMatchObject({
        alert_entities: expect.objectContaining({ hostname: ['webserver-01'] }),
        total_entities: 1,
        recommendation: expect.stringContaining('Extracted 1 entities'),
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
  });
});
