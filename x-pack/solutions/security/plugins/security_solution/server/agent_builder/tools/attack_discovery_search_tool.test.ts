/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type EsqlResults, type ErrorResult } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { attackDiscoverySearchTool } from './attack_discovery_search_tool';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

describe('attackDiscoverySearchTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = attackDiscoverySearchTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('schema', () => {
    it('validates correct schema with alertIds array', () => {
      const validInput = {
        alertIds: ['alert-1', 'alert-2'],
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects non-array alertIds', () => {
      const invalidInput = {
        alertIds: 'not-an-array',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty alertIds array', () => {
      const invalidInput = {
        alertIds: [],
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('builds correct ES|QL query with date filter and alert IDs', async () => {
      const mockEsqlResponse = {
        columns: [{ name: '_id', type: 'keyword' }],
        values: [['attack-discovery-1']],
      };
      (executeEsql as jest.Mock).mockResolvedValue(mockEsqlResponse);

      await tool.handler(
        { alertIds: ['alert-1', 'alert-2'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(executeEsql).toHaveBeenCalled();
      const callArgs = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(callArgs.query).toContain('FROM .alerts-security.attack.discovery.alerts-default*');
      expect(callArgs.query).toContain(
        'MV_CONTAINS(kibana.alert.attack_discovery.alert_ids,"alert-1")'
      );
      expect(callArgs.query).toContain(
        'MV_CONTAINS(kibana.alert.attack_discovery.alert_ids,"alert-2")'
      );
      expect(callArgs.query).toContain('@timestamp >=');
      expect(callArgs.query).toContain('LIMIT 100');
    });

    it('uses handler context spaceId in ES|QL index pattern', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({ columns: [], values: [] });

      await tool.handler(
        { alertIds: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId: 'custom-space' })
      );

      const callArgs = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(callArgs.query).toContain(
        'FROM .alerts-security.attack.discovery.alerts-custom-space*'
      );
    });

    it('executes ES|QL query and returns tabular data', async () => {
      const mockEsqlResponse = {
        columns: [
          { name: '_id', type: 'keyword' },
          { name: 'kibana.alert.attack_discovery.title', type: 'keyword' },
        ],
        values: [
          ['attack-discovery-1', 'Test Attack Discovery'],
          ['attack-discovery-2', 'Another Attack Discovery'],
        ],
      };
      (executeEsql as jest.Mock).mockResolvedValue(mockEsqlResponse);

      const result = (await tool.handler(
        { alertIds: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(2);
      expect(result.results[0].type).toBe(ToolResultType.query);
      const esqlResult = result.results[1] as EsqlResults;
      expect(esqlResult.type).toBe(ToolResultType.esqlResults);
      expect(esqlResult.data.columns).toEqual(mockEsqlResponse.columns);
      expect(esqlResult.data.values).toEqual(mockEsqlResponse.values);
    });

    it('limits results appropriately', async () => {
      const mockEsqlResponse = {
        columns: [{ name: '_id', type: 'keyword' }],
        values: Array.from({ length: 100 }, (_, i) => [`attack-discovery-${i}`]),
      };
      (executeEsql as jest.Mock).mockResolvedValue(mockEsqlResponse);

      await tool.handler(
        { alertIds: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const callArgs = (executeEsql as jest.Mock).mock.calls[0][0];
      expect(callArgs.query).toContain('LIMIT 100');
    });

    it('handles query failures', async () => {
      const error = new Error('ES|QL query failed');
      (executeEsql as jest.Mock).mockRejectedValue(error);

      const result = (await tool.handler(
        { alertIds: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error: ES|QL query failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('builds date filter for last 7 days', async () => {
      const mockEsqlResponse = {
        columns: [{ name: '_id', type: 'keyword' }],
        values: [],
      };
      (executeEsql as jest.Mock).mockResolvedValue(mockEsqlResponse);

      await tool.handler(
        { alertIds: ['alert-1'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const callArgs = (executeEsql as jest.Mock).mock.calls[0][0];
      const query = callArgs.query;
      expect(query).toContain('@timestamp >=');
      expect(query).toContain('@timestamp <=');
    });
  });
});
