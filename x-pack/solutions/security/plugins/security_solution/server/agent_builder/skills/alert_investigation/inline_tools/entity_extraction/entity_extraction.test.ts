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
import { getEntityExtractionInlineTool, ENTITY_EXTRACTION_TOOL_ID } from './entity_extraction';

jest.mock('@kbn/elastic-assistant-plugin/server', () => ({
  extractEntitiesFromAlerts: jest.fn(),
}));

describe('entityExtractionInlineTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getEntityExtractionInlineTool();

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
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(ENTITY_EXTRACTION_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('calls extractEntitiesFromAlerts with fetched alerts', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'alert-1', _source: { 'host.name': 'server-01' } }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [
          { typeKey: 'hostname', value: 'server-01', field: 'host.name', alertId: 'alert-1' },
        ],
        stats: { totalFields: 20, fieldsWithValues: 1, entitiesExtracted: 1, entitiesAfterDedup: 1 },
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
        total_alerts_processed: 1,
        summary: expect.stringContaining('1 unique entities'),
      });
    });

    it('groups entities by type', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: {
          hits: [{ _id: 'a1', _source: {} }],
          total: { value: 1, relation: 'eq' },
        },
      } as any);

      (extractEntitiesFromAlerts as jest.Mock).mockReturnValueOnce({
        entities: [
          { typeKey: 'ip', value: '10.0.0.1', field: 'source.ip', alertId: 'a1' },
          { typeKey: 'ip', value: '10.0.0.2', field: 'destination.ip', alertId: 'a1' },
          { typeKey: 'hostname', value: 'host-1', field: 'host.name', alertId: 'a1' },
        ],
        stats: { totalFields: 20, fieldsWithValues: 3, entitiesExtracted: 3, entitiesAfterDedup: 3 },
      });

      const result = await tool.handler(
        { alert_ids: ['a1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const ipEntry = result.entities_by_type.find((e: { type: string }) => e.type === 'ip');
      expect(ipEntry).toMatchObject({ type: 'ip', count: 2 });
    });
  });
});
