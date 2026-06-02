/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import type { RetentionPayload, CategoriesResponse } from '@kbn/siem-readiness';
import {
  createToolTestMocks,
  createToolHandlerContext,
  setupMockCoreStartServices,
} from '../../__mocks__/test_helpers';
import { getRetentionTool } from './get_retention_tool';
import { getRetention } from '../../../lib/siem_readiness/dimensions';
import { fetchCategories } from '../../../lib/siem_readiness/fetchers';
import { filterRetentionItemsByCategories } from '@kbn/siem-readiness';

jest.mock('../../../lib/siem_readiness/dimensions', () => ({ getRetention: jest.fn() }));
jest.mock('../../../lib/siem_readiness/fetchers', () => ({ fetchCategories: jest.fn() }));

const mockGetRetention = getRetention as jest.Mock;
const mockFetchCategories = fetchCategories as jest.Mock;

// Retention items carry data stream names; category map has backing index names.
// The contains-match is: backing_index.includes(data_stream_name).
const CLOUD_BACKING_INDEX = '.ds-logs-cloud.stream-default-2024.01.01-000001';
const CLOUD_DATA_STREAM = 'logs-cloud.stream-default';
const NETWORK_BACKING_INDEX = '.ds-logs-network.dns-default-2024.01.01-000001';
const NETWORK_DATA_STREAM = 'logs-network.dns-default';

const mockCategories: CategoriesResponse = {
  rawCategoriesMap: [],
  mainCategoriesMap: [
    { category: 'Cloud', indices: [{ indexName: CLOUD_BACKING_INDEX, docs: 500 }] },
    { category: 'Network', indices: [{ indexName: NETWORK_BACKING_INDEX, docs: 200 }] },
  ],
};

const makePayload = (overrides: Partial<RetentionPayload> = {}): RetentionPayload => ({
  status: 'healthy',
  summary: 'All items compliant.',
  items: [],
  actionableFindings: [],
  ...overrides,
});

const makeRetentionItem = (indexName: string, status: 'healthy' | 'non-compliant' = 'healthy') => ({
  indexName,
  isDataStream: true,
  retentionType: 'ilm' as const,
  retentionPeriod: status === 'healthy' ? '400d' : '30d',
  retentionDays: status === 'healthy' ? 400 : 30,
  policyName: 'policy-1',
  status,
});

describe('getRetentionTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = getRetentionTool(mockCore, mockLogger, false);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
    mockFetchCategories.mockResolvedValue(mockCategories);
  });

  describe('handler — category filtering (contains-match)', () => {
    it('filters out items whose name does not appear in any category backing index', async () => {
      mockGetRetention.mockResolvedValueOnce(
        makePayload({
          items: [makeRetentionItem('logs-completely-unrelated-default')],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<RetentionPayload>).data;
      expect(data.items).toHaveLength(0);
    });

    it('keeps items whose data stream name is a substring of a category backing index', async () => {
      mockGetRetention.mockResolvedValueOnce(
        makePayload({
          items: [
            makeRetentionItem(CLOUD_DATA_STREAM),
            makeRetentionItem('logs-unrelated-default'),
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<RetentionPayload>).data;
      expect(data.items).toHaveLength(1);
      expect(data.items[0].indexName).toBe(CLOUD_DATA_STREAM);
    });
  });

  describe('handler — finding category enrichment', () => {
    it('assigns category to findings that match via contains-match', async () => {
      mockGetRetention.mockResolvedValueOnce(
        makePayload({
          items: [makeRetentionItem(NETWORK_DATA_STREAM, 'non-compliant')],
          actionableFindings: [
            { severity: 'warning', message: 'below threshold', resource: NETWORK_DATA_STREAM },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<RetentionPayload>).data;
      expect(data.actionableFindings![0].category).toBe('Network');
    });

    it('filters out findings whose resource has no category match', async () => {
      mockGetRetention.mockResolvedValueOnce(
        makePayload({
          items: [],
          actionableFindings: [
            { severity: 'warning', message: 'unknown stream', resource: 'logs-orphan-default' },
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<RetentionPayload>).data;
      // logs-orphan-default is not in any category backing index → finding is dropped
      expect(data.actionableFindings).toHaveLength(0);
    });
  });

  describe('handler — summary recomputation after filtering', () => {
    it('recomputes summary and status from filtered items, not the pre-filter payload', async () => {
      // Orchestrator sees 13 items (2 non-compliant), but only 5 are categorized.
      const uncategorizedItems = Array.from({ length: 8 }, (_, i) =>
        makeRetentionItem(`logs-uncategorized-${i}-default`, 'non-compliant')
      );
      mockGetRetention.mockResolvedValueOnce(
        makePayload({
          status: 'actionsRequired',
          summary: '2 of 13 data streams or indices have retention below the 365-day threshold.',
          items: [
            makeRetentionItem(CLOUD_DATA_STREAM, 'non-compliant'),
            makeRetentionItem(NETWORK_DATA_STREAM, 'healthy'),
            ...uncategorizedItems,
          ],
          actionableFindings: [
            { severity: 'warning', message: 'below threshold', resource: CLOUD_DATA_STREAM },
            // uncategorized findings that should be filtered out
            ...uncategorizedItems.map((item) => ({
              severity: 'warning' as const,
              message: 'below threshold',
              resource: item.indexName,
            })),
          ],
        })
      );

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const data = (result.results[0] as OtherResult<RetentionPayload>).data;
      // After filtering: only Cloud + Network (2 items)
      expect(data.items).toHaveLength(2);
      // Summary must reference 2, not 13
      expect(data.summary).toContain('2');
      expect(data.summary).not.toContain('13');
      // Only the Cloud finding survives (Network is healthy, uncategorized findings dropped)
      expect(data.actionableFindings).toHaveLength(1);
      expect(data.actionableFindings![0].resource).toBe(CLOUD_DATA_STREAM);
    });
  });

  describe('handler — result shape', () => {
    it('returns ToolResultType.other on success', async () => {
      mockGetRetention.mockResolvedValueOnce(makePayload());
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.other);
    });

    it('returns ToolResultType.error when getRetention throws', async () => {
      mockGetRetention.mockRejectedValueOnce(new Error('ILM fetch failed'));
      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;
      expect(result.results[0].type).toBe(ToolResultType.error);
    });
  });

  describe('parity — agent tool matches filterRetentionItemsByCategories (shared predicate)', () => {
    it('agent data.items contains exactly the items that filterRetentionItemsByCategories returns', async () => {
      const rawItems = [
        makeRetentionItem(CLOUD_DATA_STREAM),
        makeRetentionItem(NETWORK_DATA_STREAM),
        makeRetentionItem('logs-completely-unrelated-default'),
      ];
      mockGetRetention.mockResolvedValueOnce(makePayload({ items: rawItems }));

      const result = (await tool.handler(
        {},
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      const agentItemNames = (result.results[0] as OtherResult<RetentionPayload>).data.items.map(
        (i) => i.indexName
      );
      // Apply the same shared predicate that the UI tab now uses
      const sharedFilterNames = filterRetentionItemsByCategories(rawItems, mockCategories).map(
        (i) => i.indexName
      );

      expect(agentItemNames).toEqual(sharedFilterNames);
    });
  });
});
