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

      const data = (result.results[0] as OtherResult).data as RetentionPayload;
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

      const data = (result.results[0] as OtherResult).data as RetentionPayload;
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

      const data = (result.results[0] as OtherResult).data as RetentionPayload;
      expect(data.actionableFindings![0].category).toBe('Network');
    });

    it('leaves finding category undefined when resource has no category match', async () => {
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

      const data = (result.results[0] as OtherResult).data as RetentionPayload;
      expect(data.actionableFindings![0].category).toBeUndefined();
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
});
