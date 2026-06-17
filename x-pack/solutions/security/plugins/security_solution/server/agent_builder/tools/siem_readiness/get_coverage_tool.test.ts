/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { CoveragePayload } from '@kbn/siem-readiness';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { getCoverageTool } from './get_coverage_tool';
import { getCoverage } from '../../../lib/siem_readiness/dimensions';
import { getSiemReadinessSharedContext } from '../../../lib/siem_readiness/fetchers';

jest.mock('../../../lib/siem_readiness/dimensions', () => ({ getCoverage: jest.fn() }));
jest.mock('../../../lib/siem_readiness/fetchers', () => ({
  getSiemReadinessSharedContext: jest.fn(),
  fetchSiemReadinessSharedContext: jest.fn(),
}));

const mockGetCoverage = getCoverage as jest.Mock;
const mockGetSharedContext = getSiemReadinessSharedContext as jest.Mock;

const mockSharedContext = {
  reverseMapResult: {
    indexToRules: new Map(),
    pipelineToIndices: new Map(),
    categoryToIndices: new Map(),
    tacticTotals: new Map(),
    mlRules: [],
  },
  categoriesResult: { rawCategoriesMap: [], mainCategoriesMap: [] },
  indexToPlatform: new Map(),
};

const makePayload = (overrides: Partial<CoveragePayload> = {}): CoveragePayload => ({
  status: 'healthy',
  summary: 'Coverage is healthy.',
  items: [],
  actionableFindings: [],
  ...overrides,
});

describe('getCoverageTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getCoverageTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockGetSharedContext.mockResolvedValue(mockSharedContext);
  });

  describe('handler — result shape', () => {
    it('returns ToolResultType.other on success', async () => {
      mockGetCoverage.mockResolvedValueOnce(makePayload());
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('returns ToolResultType.error when getCoverage throws', async () => {
      mockGetCoverage.mockRejectedValueOnce(new Error('ES failure'));
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('handler — payload passthrough', () => {
    it('passes the payload from getCoverage directly to the result data', async () => {
      const payload = makePayload({
        status: 'actionsRequired',
        summary: 'Some categories missing data.',
        items: [
          { category: 'Endpoint', indices: [{ indexName: 'logs-endpoint-default', docs: 500 }] },
        ],
        actionableFindings: [
          {
            severity: 'WARNING',
            message: 'No data for Cloud.',
            resource: 'Cloud',
            category: 'Cloud',
          },
        ],
      });
      mockGetCoverage.mockResolvedValueOnce(payload);

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<CoveragePayload>).data;
      expect(data.status).toBe('actionsRequired');
      expect(data.items).toHaveLength(1);
      expect(data.actionableFindings).toHaveLength(1);
    });
  });
});
