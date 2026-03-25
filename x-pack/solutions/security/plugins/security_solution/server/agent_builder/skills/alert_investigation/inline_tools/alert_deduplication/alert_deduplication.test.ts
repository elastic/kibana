/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deduplicateAlerts } from '@kbn/elastic-assistant-plugin/server';
import {
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../../../../__mocks__/test_helpers';
import {
  getAlertDeduplicationInlineTool,
  ALERT_DEDUPLICATION_TOOL_ID,
} from './alert_deduplication';

jest.mock('@kbn/elastic-assistant-plugin/server', () => ({
  deduplicateAlerts: jest.fn(),
}));

describe('alertDeduplicationInlineTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getAlertDeduplicationInlineTool();

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct input with alert_ids', () => {
      const result = tool.schema.safeParse({
        alert_ids: ['alert-1', 'alert-2'],
      });
      expect(result.success).toBe(true);
    });

    it('validates input with optional similarity_threshold', () => {
      const result = tool.schema.safeParse({
        alert_ids: ['alert-1', 'alert-2'],
        similarity_threshold: 0.7,
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
        similarity_threshold: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('tool properties', () => {
    it('returns correct tool id', () => {
      expect(tool.id).toBe(ALERT_DEDUPLICATION_TOOL_ID);
    });

    it('has a description mentioning duplicates', () => {
      expect(tool.description).toContain('duplicate');
    });
  });

  describe('handler', () => {
    it('returns early when fewer than 2 alerts found', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [{ _id: 'alert-1', _source: {} }], total: { value: 1, relation: 'eq' } },
      } as any);

      const result = await tool.handler(
        { alert_ids: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result).toMatchObject({
        total_alerts: 1,
        message: expect.stringContaining('Need at least 2'),
      });
      expect(deduplicateAlerts).not.toHaveBeenCalled();
    });

    it('calls deduplicateAlerts with fetched alerts', async () => {
      const mockAlerts = [
        { _id: 'alert-1', _source: { 'kibana.alert.rule.name': 'Test Rule' } },
        { _id: 'alert-2', _source: { 'kibana.alert.rule.name': 'Test Rule' } },
      ];
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: mockAlerts, total: { value: 2, relation: 'eq' } },
      } as any);

      (deduplicateAlerts as jest.Mock).mockResolvedValueOnce({
        leaders: [mockAlerts[0]],
        clusters: [{ leaderId: 'alert-1', leaderRiskScore: 50, memberIds: ['alert-2'] }],
        stats: {
          totalAlerts: 2,
          uniqueClusters: 1,
          duplicatesRemoved: 1,
          deduplicationRate: 0.5,
        },
      });

      const result = await tool.handler(
        { alert_ids: ['alert-1', 'alert-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(deduplicateAlerts).toHaveBeenCalledWith(
        expect.objectContaining({
          alerts: expect.arrayContaining([
            expect.objectContaining({ _id: 'alert-1' }),
            expect.objectContaining({ _id: 'alert-2' }),
          ]),
        })
      );

      expect(result).toMatchObject({
        duplicate_groups: expect.arrayContaining([
          expect.objectContaining({
            leader_alert_id: 'alert-1',
            member_alert_ids: ['alert-2'],
            count: 2,
          }),
        ]),
        duplicates_removed: 1,
        deduplication_rate: '50.0%',
      });
    });

    it('uses correct index with spaceId', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      } as any);

      await tool.handler(
        { alert_ids: ['a1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, {
          spaceId: 'custom-space',
        })
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.alerts-security.alerts-custom-space',
        })
      );
    });
  });
});
