/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { QualityPayload, CategoriesResponse } from '@kbn/siem-readiness';
import { getIndexCategoryMap } from '@kbn/siem-readiness';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { getQualityTool } from './get_quality_tool';
import { getQuality } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';

jest.mock('../../../lib/siem_readiness/dimensions', () => ({ getQuality: jest.fn() }));
jest.mock('../../../lib/siem_readiness/fetchers', () => ({ fetchCategories: jest.fn() }));

const mockGetQuality = getQuality as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;

// Quality uses exact-match: DataQualityResultDocument.indexName must be in the category index list.
const IDENTITY_INDEX = 'logs-identity.auth-default';
const CLOUD_INDEX = 'logs-cloud.asset_inventory-default';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Identity', indices: [{ indexName: IDENTITY_INDEX, docs: 300 }] },
    { category: 'Cloud', indices: [{ indexName: CLOUD_INDEX, docs: 150 }] },
  ],
};

const makePayload = (overrides: Partial<QualityPayload> = {}): QualityPayload => ({
  status: 'healthy',
  summary: 'All checked indices are ECS-compatible.',
  items: [],
  actionableFindings: [],
  ...overrides,
});

const makeQualityResult = (indexName: string, incompatibleFieldCount = 0) => ({
  indexName,
  incompatibleFieldCount,
  batchId: 'b1',
  isCheckAll: false,
  checkedAt: Date.now(),
  docsCount: 100,
  totalFieldCount: 50,
  ecsFieldCount: 48,
  customFieldCount: 2,
  sameFamilyFieldCount: 0,
  sameFamilyFields: [],
  sameFamilyFieldItems: [],
  incompatibleFieldMappingItems: [],
  incompatibleFieldValueItems: [],
  unallowedMappingFields: [],
  unallowedValueFields: [],
  sizeInBytes: 1024,
  markdownComments: [],
  ecsVersion: '8.11.0',
  error: null,
});

describe('getQualityTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getQualityTool(mockCore, mockLogger);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetchCategories.mockResolvedValue(mockCategories);
  });

  describe('handler — category filtering (exact-match)', () => {
    it('filters out results whose indexName is not in any category', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          items: [makeQualityResult('logs-some-uncategorized-index')],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.items).toHaveLength(0);
    });

    it('keeps results whose indexName is in the category map', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          items: [makeQualityResult(IDENTITY_INDEX, 2), makeQualityResult('logs-uncategorized', 0)],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.items).toHaveLength(1);
      expect(data.items[0].indexName).toBe(IDENTITY_INDEX);
    });

    it('keeps results from multiple categories', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          items: [makeQualityResult(IDENTITY_INDEX), makeQualityResult(CLOUD_INDEX)],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.items).toHaveLength(2);
    });
  });

  describe('handler — finding category enrichment', () => {
    it('assigns category to findings matched by indexName', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          items: [makeQualityResult(CLOUD_INDEX, 3)],
          actionableFindings: [
            { severity: 'warning', message: '3 incompatible fields', resource: CLOUD_INDEX },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.actionableFindings![0].category).toBe('Cloud');
    });

    it('filters out findings whose resource is not in any category', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          items: [],
          actionableFindings: [
            { severity: 'warning', message: 'incompatible', resource: 'logs-not-categorized' },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.actionableFindings).toHaveLength(0);
    });
  });

  describe('handler — summary recomputation after filtering', () => {
    it('recomputes status and summary from filtered items, not the pre-filter payload', async () => {
      // Orchestrator sees 5 items (3 incompatible), only 2 categorized (1 incompatible).
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          status: 'actionsRequired',
          summary: '3 of 5 indices have incompatible ECS field mappings.',
          items: [
            makeQualityResult(IDENTITY_INDEX, 2),
            makeQualityResult(CLOUD_INDEX, 0),
            makeQualityResult('logs-uncategorized-1', 3),
            makeQualityResult('logs-uncategorized-2', 1),
            makeQualityResult('logs-uncategorized-3', 0),
          ],
          actionableFindings: [
            { severity: 'warning', message: '2 incompatible fields', resource: IDENTITY_INDEX },
            { severity: 'warning', message: '3 incompatible', resource: 'logs-uncategorized-1' },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.items).toHaveLength(2);
      expect(data.status).toBe('actionsRequired');
      // Summary must reference 1 of 2, not 3 of 5
      expect(data.summary).toContain('1');
      expect(data.summary).toContain('2');
      expect(data.summary).not.toContain('5');
      // Only the categorized finding survives
      expect(data.actionableFindings).toHaveLength(1);
      expect(data.actionableFindings![0].resource).toBe(IDENTITY_INDEX);
    });

    it('reports healthy when all categorized items are compatible, regardless of uncategorized', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          status: 'actionsRequired',
          summary: '2 of 20 indices have incompatible ECS field mappings.',
          items: [
            makeQualityResult(IDENTITY_INDEX, 0),
            makeQualityResult(CLOUD_INDEX, 0),
            makeQualityResult('logs-uncategorized', 2),
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.status).toBe('healthy');
      expect(data.summary).toContain('2');
    });

    it('reports noData when no categorized items survive filtering', async () => {
      mockGetQuality.mockResolvedValueOnce(
        makePayload({
          status: 'actionsRequired',
          summary: 'Some problems found.',
          items: [makeQualityResult('logs-uncategorized', 3)],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<QualityPayload>).data;
      expect(data.status).toBe('noData');
    });
  });

  describe('parity — agent tool matches getIndexCategoryMap filter (shared predicate)', () => {
    it('agent data.items contains exactly the items that match the category map', async () => {
      const allItems = [
        makeQualityResult(IDENTITY_INDEX, 0),
        makeQualityResult(CLOUD_INDEX, 1),
        makeQualityResult('logs-uncategorized', 2),
      ];
      mockGetQuality.mockResolvedValueOnce(makePayload({ items: allItems }));

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const agentItemNames = (result.results[0] as OtherResult<QualityPayload>).data.items.map(
        (i) => i.indexName
      );
      const categoryMap = getIndexCategoryMap(mockCategories);
      const sharedFilteredNames = allItems
        .filter((item) => categoryMap.has(item.indexName))
        .map((item) => item.indexName);

      expect(agentItemNames).toEqual(sharedFilteredNames);
    });
  });

  describe('handler — result shape', () => {
    it('returns ToolResultType.other on success', async () => {
      mockGetQuality.mockResolvedValueOnce(makePayload());
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('returns ToolResultType.error when getQuality throws', async () => {
      mockGetQuality.mockRejectedValueOnce(new Error('quality fetch failed'));
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });
});
