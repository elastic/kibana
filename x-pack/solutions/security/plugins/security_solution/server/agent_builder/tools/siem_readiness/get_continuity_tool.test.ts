/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { ContinuityPayload, CategoriesResponse } from '@kbn/siem-readiness';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { getContinuityTool } from './get_continuity_tool';
import { getContinuity } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';
import { filterPipelinesByCategories } from '@kbn/siem-readiness';

jest.mock('../../../lib/siem_readiness/dimensions', () => ({ getContinuity: jest.fn() }));
jest.mock('../../../lib/siem_readiness/fetchers', () => ({ fetchCategories: jest.fn() }));

const mockGetContinuity = getContinuity as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;

const ENDPOINT_INDEX = '.ds-logs-endpoint.events-2024.01.01-000001';
const NETWORK_INDEX = '.ds-logs-network.traffic-2024.01.01-000001';
const INTERNAL_INDEX = '.kibana_task_manager-8.0.0-000001';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Endpoint', indices: [{ indexName: ENDPOINT_INDEX, docs: 1000 }] },
    { category: 'Network', indices: [{ indexName: NETWORK_INDEX, docs: 500 }] },
  ],
};

const makePayload = (overrides: Partial<ContinuityPayload> = {}): ContinuityPayload => ({
  status: 'healthy',
  summary: 'All pipelines healthy.',
  items: [],
  actionableFindings: [],
  ...overrides,
});

describe('getContinuityTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getContinuityTool(mockCore, mockLogger, false);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetchCategories.mockResolvedValue(mockCategories);
  });

  describe('handler — category filtering', () => {
    it('filters out pipelines that serve no categorized index', async () => {
      mockGetContinuity.mockResolvedValueOnce(
        makePayload({
          items: [
            {
              name: 'internal',
              indices: [INTERNAL_INDEX],
              docsCount: 100,
              failedDocsCount: 0,
              statsAvailable: true,
            },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<ContinuityPayload>).data;
      expect(data.items).toHaveLength(0);
    });

    it('keeps pipelines that serve at least one categorized index', async () => {
      mockGetContinuity.mockResolvedValueOnce(
        makePayload({
          items: [
            {
              name: 'endpoint-pipeline',
              indices: [ENDPOINT_INDEX],
              docsCount: 1000,
              failedDocsCount: 0,
              statsAvailable: true,
            },
            {
              name: 'internal',
              indices: [INTERNAL_INDEX],
              docsCount: 100,
              failedDocsCount: 0,
              statsAvailable: true,
            },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<ContinuityPayload>).data;
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe('endpoint-pipeline');
    });
  });

  describe('handler — finding category enrichment', () => {
    it('enriches a finding with the category of its pipeline', async () => {
      mockGetContinuity.mockResolvedValueOnce(
        makePayload({
          items: [
            {
              name: 'endpoint-pipeline',
              indices: [ENDPOINT_INDEX],
              docsCount: 100,
              failedDocsCount: 5,
              statsAvailable: true,
            },
          ],
          actionableFindings: [
            { severity: 'critical', message: 'critical failure', resource: 'endpoint-pipeline' },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<ContinuityPayload>).data;
      expect(data.actionableFindings![0].category).toBe('Endpoint');
    });

    it('filters out findings whose resource is not in any categorized pipeline', async () => {
      mockGetContinuity.mockResolvedValueOnce(
        makePayload({
          items: [],
          actionableFindings: [
            {
              severity: 'critical',
              message: 'unknown pipeline failure',
              resource: 'ghost-pipeline',
            },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<ContinuityPayload>).data;
      // ghost-pipeline is not in categorizedItems → finding is dropped
      expect(data.actionableFindings).toHaveLength(0);
    });
  });

  describe('handler — summary recomputation after filtering', () => {
    it('recomputes summary and status from filtered items, not the pre-filter payload', async () => {
      // Orchestrator sees 3 pipelines (summary: "All 3 active..."), but 2 are uncategorized.
      mockGetContinuity.mockResolvedValueOnce(
        makePayload({
          status: 'healthy',
          summary: 'All 3 active ingest pipelines are functioning properly.',
          items: [
            {
              name: 'endpoint-pipeline',
              indices: [ENDPOINT_INDEX],
              docsCount: 1000,
              failedDocsCount: 0,
              statsAvailable: true,
            },
            {
              name: 'internal-1',
              indices: [INTERNAL_INDEX],
              docsCount: 50,
              failedDocsCount: 0,
              statsAvailable: true,
            },
            {
              name: 'internal-2',
              indices: ['.other-internal-000001'],
              docsCount: 50,
              failedDocsCount: 0,
              statsAvailable: true,
            },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<ContinuityPayload>).data;
      // After filtering: only endpoint-pipeline remains
      expect(data.items).toHaveLength(1);
      // Summary must reference 1, not 3
      expect(data.summary).toContain('1');
      expect(data.summary).not.toContain('3');
      expect(data.status).toBe('healthy');
    });
  });

  describe('handler — result shape', () => {
    it('returns ToolResultType.other on success', async () => {
      mockGetContinuity.mockResolvedValueOnce(makePayload());
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('returns ToolResultType.error when getContinuity throws', async () => {
      mockGetContinuity.mockRejectedValueOnce(new Error('ES failure'));
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('parity — agent tool matches filterPipelinesByCategories (shared predicate)', () => {
    it('agent data.items contains exactly the pipelines that filterPipelinesByCategories returns', async () => {
      const rawPipelines = [
        {
          name: 'endpoint-pipeline',
          indices: [ENDPOINT_INDEX],
          docsCount: 1000,
          failedDocsCount: 0,
          statsAvailable: true,
        },
        {
          name: 'network-pipeline',
          indices: [NETWORK_INDEX],
          docsCount: 500,
          failedDocsCount: 0,
          statsAvailable: true,
        },
        {
          name: 'internal',
          indices: [INTERNAL_INDEX],
          docsCount: 50,
          failedDocsCount: 0,
          statsAvailable: true,
        },
      ];
      mockGetContinuity.mockResolvedValueOnce(makePayload({ items: rawPipelines }));

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const agentItemNames = (result.results[0] as OtherResult<ContinuityPayload>).data.items.map(
        (p) => p.name
      );
      // Apply the same shared predicate that the UI tab now uses
      const sharedFilterNames = filterPipelinesByCategories(rawPipelines, mockCategories).map(
        (p) => p.name
      );

      expect(agentItemNames).toEqual(sharedFilterNames);
    });
  });
});
