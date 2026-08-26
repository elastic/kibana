/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

import { ToolResultType } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import { createToolHandlerContext, createToolTestMocks } from '../__mocks__/test_helpers';
import { PCI_COMPLIANCE_TOOL_ID, pciComplianceTool } from './pci_compliance_tool';

const mockExecuteEsql = executeEsql as jest.MockedFunction<typeof executeEsql>;

describe('pciComplianceTool (consolidated)', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciComplianceTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: coverage returns 1 matching event so we exit layer 2 cleanly.
    mockExecuteEsql.mockResolvedValue({
      columns: [{ name: 'matching_events', type: 'long' }],
      values: [[1]],
    } as never);
    mockEsClient.asCurrentUser.fieldCaps.mockResolvedValue({
      fields: { '@timestamp': { date: { type: 'date' } } },
    } as never);
  });

  describe('properties', () => {
    it('returns the consolidated tool id', () => {
      expect(tool.id).toBe(PCI_COMPLIANCE_TOOL_ID);
    });
  });

  describe('schema', () => {
    it('rejects missing mode', () => {
      expect(tool.schema.safeParse({}).success).toBe(false);
    });

    it('rejects unknown mode', () => {
      expect(tool.schema.safeParse({ mode: 'invalid' }).success).toBe(false);
    });

    it('rejects indices that look like injection attempts', () => {
      const result = tool.schema.safeParse({
        mode: 'check',
        indices: ['logs-*"; DROP'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects an inverted timeRange', () => {
      const result = tool.schema.safeParse({
        mode: 'check',
        timeRange: { from: '2024-03-01T00:00:00Z', to: '2024-01-01T00:00:00Z' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown requirement ids', () => {
      const result = tool.schema.safeParse({
        mode: 'check',
        requirements: ['99'],
      });
      expect(result.success).toBe(false);
    });

    it('accepts a well-formed check request', () => {
      const result = tool.schema.safeParse({
        mode: 'check',
        requirements: ['8'],
        indices: ['logs-*'],
        timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a well-formed report request with `all`', () => {
      const result = tool.schema.safeParse({
        mode: 'report',
        requirements: ['all'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ES|QL injection protection', () => {
    it('binds ?_tstart / ?_tend from timeRange without interpolating', async () => {
      await tool.handler(
        {
          mode: 'check',
          requirements: ['1'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: false,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockExecuteEsql).toHaveBeenCalled();
      const call = mockExecuteEsql.mock.calls[0][0];
      expect(call.query).toContain('?_tstart');
      expect(call.query).toContain('?_tend');
      expect(call.query).not.toContain('2024-01-01T00:00:00Z');
      expect(call.params).toEqual([
        { _tstart: '2024-01-01T00:00:00Z' },
        { _tend: '2024-01-08T00:00:00Z' },
      ]);
    });

    it('uses the validated index pattern verbatim in FROM', async () => {
      await tool.handler(
        {
          mode: 'check',
          requirements: ['1'],
          indices: ['cluster-a:logs-pci-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: false,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const call = mockExecuteEsql.mock.calls[0][0];
      expect(call.query).toContain('FROM cluster-a:logs-pci-*');
    });
  });

  describe('scope claim', () => {
    it('attaches a scopeClaim describing what was evaluated in check mode', async () => {
      const result = (await tool.handler(
        {
          mode: 'check',
          requirements: ['1'],
          indices: ['logs-custom-a*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: false,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const summary = result.results.find((r) => r.type === ToolResultType.other);
      const data = summary?.data as {
        scopeClaim: {
          pciDssVersion: string;
          indices: string[];
          requirementsEvaluated: string[];
          timeRange: { from: string; to: string };
          disclaimer: string;
        };
      };
      expect(data.scopeClaim.pciDssVersion).toBe('4.0.1');
      expect(data.scopeClaim.indices).toEqual(['logs-custom-a*']);
      expect(data.scopeClaim.requirementsEvaluated).toContain('1');
      expect(data.scopeClaim.timeRange).toEqual({
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-08T00:00:00Z',
      });
      expect(data.scopeClaim.disclaimer).toContain('Qualified Security Assessor');
    });

    it('attaches a scopeClaim in report mode too', async () => {
      const result = (await tool.handler(
        {
          mode: 'report',
          requirements: ['1'],
          indices: ['logs-custom-a*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          format: 'summary',
          includeRecommendations: true,
          includeEvidence: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const summary = result.results.find((r) => r.type === ToolResultType.other);
      const data = summary?.data as {
        mode: string;
        scopeClaim: { pciDssVersion: string; disclaimer: string };
      };
      expect(data.mode).toBe('report');
      expect(data.scopeClaim.pciDssVersion).toBe('4.0.1');
      expect(data.scopeClaim.disclaimer).toContain('Qualified Security Assessor');
    });
  });

  describe('response shape', () => {
    it('returns an ESQL scorecard followed by a summary in report mode', async () => {
      const result = (await tool.handler(
        {
          mode: 'report',
          requirements: ['1'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          format: 'summary',
          includeRecommendations: true,
          includeEvidence: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const types = result.results.map((r) => r.type);
      expect(types).toContain(ToolResultType.esqlResults);
      expect(types).toContain(ToolResultType.other);
    });

    it('never emits ToolResultType.query with non-ES|QL labels', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: 'user.name', type: 'keyword' },
          { name: 'cnt', type: 'long' },
        ],
        values: [['jdoe', 15]],
      } as never);

      const checkResult = (await tool.handler(
        {
          mode: 'check',
          requirements: ['8'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: true,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const reportResult = (await tool.handler(
        {
          mode: 'report',
          requirements: ['all'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          format: 'detailed',
          includeRecommendations: true,
          includeEvidence: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      for (const { results } of [checkResult, reportResult]) {
        const queryEntries = results.filter((r) => r.type === ToolResultType.query);
        for (const entry of queryEntries) {
          const esql = (entry.data as { esql?: string }).esql ?? '';
          expect(esql).toMatch(/^(FROM|ROW|SHOW|SET|TS)\s/i);
        }
      }
    });

    it('esqlResults entries always contain valid ES|QL in the query field', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: 'user.name', type: 'keyword' },
          { name: 'cnt', type: 'long' },
        ],
        values: [['jdoe', 15]],
      } as never);

      const checkResult = (await tool.handler(
        {
          mode: 'check',
          requirements: ['8'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: true,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const reportResult = (await tool.handler(
        {
          mode: 'report',
          requirements: ['all'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          format: 'detailed',
          includeRecommendations: true,
          includeEvidence: false,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      for (const { results } of [checkResult, reportResult]) {
        const esqlEntries = results.filter((r) => r.type === ToolResultType.esqlResults);
        for (const entry of esqlEntries) {
          const query = (entry.data as { query?: string }).query ?? '';
          expect(query).toMatch(/^(FROM|ROW|SHOW|SET|TS)\s/i);
        }
      }
    });

    it('check mode esqlResults include time_range for parameter binding', async () => {
      mockExecuteEsql.mockResolvedValue({
        columns: [
          { name: 'user.name', type: 'keyword' },
          { name: 'cnt', type: 'long' },
        ],
        values: [['jdoe', 15]],
      } as never);

      const result = (await tool.handler(
        {
          mode: 'check',
          requirements: ['8'],
          indices: ['logs-*'],
          timeRange: { from: '2024-01-01T00:00:00Z', to: '2024-01-08T00:00:00Z' },
          includeEvidence: true,
          format: 'summary',
          includeRecommendations: true,
        },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const esqlEntries = result.results.filter((r) => r.type === ToolResultType.esqlResults);
      for (const entry of esqlEntries) {
        const data = entry.data as { time_range?: { from: string; to: string } };
        expect(data.time_range).toBeDefined();
        expect(data.time_range!.from).toBe('2024-01-01T00:00:00Z');
        expect(data.time_range!.to).toBe('2024-01-08T00:00:00Z');
      }
    });
  });
});
