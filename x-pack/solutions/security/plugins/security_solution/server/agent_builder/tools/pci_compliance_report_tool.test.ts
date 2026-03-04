/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType } from '@kbn/agent-builder-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
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
    it('accepts default report request', () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts detailed format with selected requirements', () => {
      const result = tool.schema.safeParse({
        format: 'detailed',
        requirements: ['1', '8.3'],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('properties', () => {
    it('returns correct id', () => {
      expect(tool.id).toBe(PCI_COMPLIANCE_REPORT_TOOL_ID);
    });
  });

  describe('handler', () => {
    it('returns error on invalid requirement identifiers', async () => {
      const result = await tool.handler(
        { requirements: ['1', 'does-not-exist'] },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('returns executive report shape', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[10]],
      });

      const result = await tool.handler(
        { requirements: ['1', '8'], format: 'executive' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(executeEsql).toHaveBeenCalledTimes(2);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const payload = result.results[0].data as { overallStatus: string; requirements: unknown[] };
      expect(payload.overallStatus).toBe('GREEN');
      expect(payload.requirements).toHaveLength(2);
    });

    it('degrades score when requirements have no evidence', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[0]],
      });

      const result = await tool.handler(
        { requirements: ['1', '2', '3'], format: 'summary' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const payload = result.results[0].data as { overallStatus: string; overallScore: number };
      expect(payload.overallStatus).toBe('RED');
      expect(payload.overallScore).toBeLessThan(85);
    });
  });
});
