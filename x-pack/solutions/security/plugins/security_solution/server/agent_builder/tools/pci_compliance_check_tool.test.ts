/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { pciComplianceCheckTool, PCI_COMPLIANCE_CHECK_TOOL_ID } from './pci_compliance_check_tool';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

describe('pciComplianceCheckTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciComplianceCheckTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
      fields: {
        'event.category': { keyword: { type: 'keyword' } },
        'event.outcome': { keyword: { type: 'keyword' } },
        'user.name': { keyword: { type: 'keyword' } },
        'source.ip': { ip: { type: 'ip' } },
        '@timestamp': { date: { type: 'date' } },
      },
    } as never);
  });

  describe('schema', () => {
    it('accepts valid requirement request', () => {
      const result = tool.schema.safeParse({ requirement: '8' });
      expect(result.success).toBe(true);
    });

    it('accepts sub-requirement request', () => {
      const result = tool.schema.safeParse({ requirement: '8.3.4' });
      expect(result.success).toBe(true);
    });

    it('rejects missing requirement', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('properties', () => {
    it('returns correct id', () => {
      expect(tool.id).toBe(PCI_COMPLIANCE_CHECK_TOOL_ID);
    });

    it('references PCI DSS v4.0.1 in description', () => {
      expect(tool.description).toContain('v4.0.1');
    });
  });

  describe('handler', () => {
    it('returns error for invalid requirement', async () => {
      const result = (await tool.handler(
        { requirement: '99', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('returns RED when violation query finds violations (8.3.4 brute force)', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [
          { name: 'user.name', type: 'keyword' },
          { name: 'source.ip', type: 'ip' },
          { name: 'failed_attempts', type: 'long' },
        ],
        values: [
          ['admin', '10.0.0.1', 15],
          ['root', '192.168.1.5', 12],
        ],
      });

      const result = (await tool.handler(
        { requirement: '8.3.4', includeEvidence: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        overallStatus: string;
        overallConfidence: string;
        requirementResults: Array<{ status: string; confidence: string }>;
      };
      expect(payload.overallStatus).toBe('RED');
      expect(payload.requirementResults[0].status).toBe('RED');
      expect(payload.requirementResults[0].confidence).toBe('HIGH');
    });

    it('returns GREEN with HIGH confidence when violation query returns 0 rows and coverage exists', async () => {
      (executeEsql as jest.Mock)
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({
          columns: [{ name: 'matching_events', type: 'long' }],
          values: [[500]],
        });

      const result = (await tool.handler(
        { requirement: '8.3.4', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        overallStatus: string;
        requirementResults: Array<{ status: string; confidence: string }>;
      };
      expect(payload.overallStatus).toBe('GREEN');
      expect(payload.requirementResults[0].status).toBe('GREEN');
      expect(payload.requirementResults[0].confidence).toBe('HIGH');
    });

    it('returns NOT_ASSESSABLE when fields are missing from index', async () => {
      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({ fields: {} } as never);

      (executeEsql as jest.Mock)
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({
          columns: [{ name: 'matching_events', type: 'long' }],
          values: [[0]],
        });

      const result = (await tool.handler(
        { requirement: '8.3.4', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        requirementResults: Array<{ status: string; confidence: string }>;
      };
      expect(payload.requirementResults[0].status).toBe('NOT_ASSESSABLE');
      expect(payload.requirementResults[0].confidence).toBe('NOT_ASSESSABLE');
    });

    it('returns AMBER when coverage query finds no data but fields exist', async () => {
      (executeEsql as jest.Mock)
        .mockResolvedValueOnce({ columns: [], values: [] })
        .mockResolvedValueOnce({
          columns: [{ name: 'matching_events', type: 'long' }],
          values: [[0]],
        });

      const result = (await tool.handler(
        { requirement: '8.3.4', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        requirementResults: Array<{ status: string }>;
      };
      expect(payload.requirementResults[0].status).toBe('AMBER');
    });

    it('includes visual esqlResults when RED violations are found', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [
          { name: 'user.name', type: 'keyword' },
          { name: 'failed_attempts', type: 'long' },
        ],
        values: [
          ['admin', 15],
          ['root', 12],
        ],
      });

      const result = (await tool.handler(
        { requirement: '8.3.4', includeEvidence: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const esqlResult = result.results.find((r) => r.type === ToolResultType.esqlResults);
      expect(esqlResult).toBeDefined();
      expect(esqlResult?.tool_result_id).toBeDefined();
    });

    it('evaluates all requirements with concurrency when "all" is specified', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[5]],
      });

      const result = (await tool.handler(
        { requirement: 'all', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalled();
      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        requirementResults: unknown[];
      };
      expect(payload.requirementResults.length).toBeGreaterThan(12);
    });

    it('expands top-level requirement to include sub-requirements', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[10]],
      });

      const result = (await tool.handler(
        { requirement: '8', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        requirementResults: Array<{ requirement: string }>;
      };
      const reqIds = payload.requirementResults.map((r) => r.requirement);
      expect(reqIds).toContain('8');
      expect(reqIds).toContain('8.3.4');
      expect(reqIds).toContain('8.4.2');
    });

    it('uses per-check timeframe when no user timeRange is provided', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [],
        values: [],
      });

      mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
        fields: {
          'event.category': { keyword: { type: 'keyword' } },
          'event.outcome': { keyword: { type: 'keyword' } },
          'user.name': { keyword: { type: 'keyword' } },
          '@timestamp': { date: { type: 'date' } },
        },
      } as never);

      await tool.handler(
        { requirement: '8.2.4', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const callArgs = (executeEsql as jest.Mock).mock.calls[0][0].query as string;
      const today = new Date();
      const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
      const yearStr = yearAgo.toISOString().substring(0, 4);
      expect(callArgs).toContain(yearStr);
    });
  });
});
