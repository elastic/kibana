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
  });

  describe('schema', () => {
    it('accepts valid requirement request', () => {
      const result = tool.schema.safeParse({ requirement: '8' });
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
  });

  describe('handler', () => {
    it('returns error for invalid requirement', async () => {
      const result = (await tool.handler(
        { requirement: '99', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results[0].type).toBe(ToolResultType.error);
    });

    it('evaluates a single requirement and returns green when evidence exists', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[5]],
      });

      const result = (await tool.handler(
        { requirement: '8', includeEvidence: true },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const payload = result.results[0].data as { overallStatus: string };
      expect(payload.overallStatus).toBe('GREEN');
    });

    it('evaluates all requirements and aggregates statuses', async () => {
      (executeEsql as jest.Mock).mockResolvedValue({
        columns: [{ name: 'matching_events', type: 'long' }],
        values: [[0]],
      });

      const result = (await tool.handler(
        { requirement: 'all', includeEvidence: false },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(executeEsql).toHaveBeenCalledTimes(12);
      const payload = result.results[0].data as { overallStatus: string };
      expect(payload.overallStatus).toBe('AMBER');
    });
  });
});
