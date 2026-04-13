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
import {
  pciComplianceReportTool,
  PCI_COMPLIANCE_REPORT_TOOL_ID,
} from './pci_compliance_report_tool';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  executeEsql: jest.fn(),
}));

describe('pciComplianceReportTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = pciComplianceReportTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('schema', () => {
    it('accepts valid report request', () => {
      const result = tool.schema.safeParse({ format: 'executive' });
      expect(result.success).toBe(true);
    });

    it('accepts empty request for full report', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('properties', () => {
    it('returns correct id', () => {
      expect(tool.id).toBe(PCI_COMPLIANCE_REPORT_TOOL_ID);
    });

    it('references PCI DSS v4.0.1 in description', () => {
      expect(tool.description).toContain('v4.0.1');
    });
  });

  describe('handler', () => {
    it('returns error for invalid requirement', async () => {
      const result = (await tool.handler(
        { requirements: ['99'], format: 'summary', includeRecommendations: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('generates executive report with correct shape', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[100]],
      });

      const result = (await tool.handler(
        { requirements: ['1'], format: 'executive', includeRecommendations: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        format: string;
        overallScore: number;
        overallStatus: string;
        overallConfidence: string;
        requirements: Array<{ id: string; status: string; confidence: string }>;
      };

      expect(payload.format).toBe('executive');
      expect(payload.overallScore).toBeGreaterThan(0);
      expect(payload.overallConfidence).toBeDefined();
    });

    it('includes visual scorecard as esqlResults', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[50]],
      });

      const result = (await tool.handler(
        { requirements: ['1'], format: 'summary', includeRecommendations: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const esqlResult = result.results.find((r) => r.type === ToolResultType.esqlResults);
      expect(esqlResult).toBeDefined();
      expect(esqlResult?.tool_result_id).toBeDefined();

      const data = esqlResult?.data as {
        columns: Array<{ name: string }>;
        values: unknown[][];
      };
      expect(data.columns.map((c) => c.name)).toEqual(
        expect.arrayContaining(['Requirement', 'Status', 'Confidence', 'Score'])
      );
    });

    it('degrades score when no evidence is found', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[0]],
      });

      const result = (await tool.handler(
        { format: 'summary', includeRecommendations: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        overallScore: number;
        overallStatus: string;
      };
      expect(payload.overallScore).toBeLessThan(85);
    });

    it('includes confidence in report rows', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[100]],
      });

      const result = (await tool.handler(
        { requirements: ['8'], format: 'detailed', includeRecommendations: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const payload = result.results.find((r) => r.type === ToolResultType.other)?.data as {
        requirements: Array<{ confidence: string; pciReference: string }>;
      };
      for (const req of payload.requirements) {
        expect(req.confidence).toBeDefined();
        expect(req.pciReference).toContain('v4.0.1');
      }
    });

    it('runs checks in parallel with concurrency control', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      (executeEsql as jest.Mock).mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 10));
        currentConcurrent--;
        return {
          columns: [{ name: 'matching_events', type: 'long' }],
          values: [[5]],
        };
      });

      await tool.handler(
        { format: 'summary', includeRecommendations: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(maxConcurrent).toBeLessThanOrEqual(4);
      expect(maxConcurrent).toBeGreaterThan(1);
    });
  });
});
