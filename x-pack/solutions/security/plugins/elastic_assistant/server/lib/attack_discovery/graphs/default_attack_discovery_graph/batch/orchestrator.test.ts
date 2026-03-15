/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Document } from '@langchain/core/documents';

import type { CombinedPrompts } from '../prompts';

jest.mock('..', () => ({
  getDefaultAttackDiscoveryGraph: jest.fn(),
}));

jest.mock('./merge', () => ({
  mergeDiscoveries: jest.fn(),
}));

import { runBatchedAttackDiscovery } from './orchestrator';
import { getDefaultAttackDiscoveryGraph } from '..';
import { mergeDiscoveries } from './merge';

const mockGetGraph = getDefaultAttackDiscoveryGraph as jest.Mock;
const mockMergeDiscoveries = mergeDiscoveries as jest.Mock;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const mockEsClient = {} as ElasticsearchClient;
const mockLlm = {} as ActionsClientLlm;

const mockPrompts = {
  default: 'default prompt',
  refine: 'refine prompt',
  continue: 'continue prompt',
  detailsMarkdown: '',
  entitySummaryMarkdown: '',
  mitreAttackTactics: '',
  summaryMarkdown: '',
  title: '',
  insights: '',
} as CombinedPrompts;

const makeAlerts = (count: number): Document[] =>
  Array.from({ length: count }, (_, i) => ({
    pageContent: `alert-${i}`,
    metadata: {},
  }));

describe('runBatchedAttackDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    const mockGraphInvoke = jest.fn().mockResolvedValue({
      insights: [
        {
          alertIds: ['alert-0'],
          title: 'Test Discovery',
          detailsMarkdown: 'details',
          summaryMarkdown: 'summary',
        },
      ],
      anonymizedDocuments: [],
      errors: [],
      replacements: {},
    });

    mockGetGraph.mockReturnValue({
      invoke: mockGraphInvoke,
    });

    mockMergeDiscoveries.mockResolvedValue({
      attackDiscoveries: [
        {
          alertIds: ['alert-0'],
          title: 'Test Discovery',
          detailsMarkdown: 'details',
          summaryMarkdown: 'summary',
        },
      ],
      anonymizedAlerts: [],
      replacements: {},
      mergeMetrics: {
        totalDiscoveriesBeforeMerge: 1,
        totalDiscoveriesAfterMerge: 1,
        discoveriesConsolidated: 0,
        consolidationRatio: 1,
        totalUniqueAlertIdsBeforeMerge: 1,
        totalUniqueAlertIdsAfterMerge: 1,
        alertCoverage: 1,
        batchesProcessed: 1,
        batchesFailed: 0,
        totalDurationMs: 1000,
        mergeDurationMs: 0,
      },
    });
  });

  it('runs without batching when alerts fit in a single batch', async () => {
    const alerts = makeAlerts(5);

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 50 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockGetGraph).toHaveBeenCalledTimes(1);
    expect(mockMergeDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        batchResults: expect.arrayContaining([expect.objectContaining({ batchIndex: 0 })]),
      })
    );
  });

  it('splits into multiple batches when alerts exceed batch size', async () => {
    const alerts = makeAlerts(10);

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 3, concurrency: 1 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockGetGraph).toHaveBeenCalledTimes(4);
    expect(mockMergeDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        batchResults: expect.arrayContaining([
          expect.objectContaining({ batchIndex: 0 }),
          expect.objectContaining({ batchIndex: 1 }),
          expect.objectContaining({ batchIndex: 2 }),
          expect.objectContaining({ batchIndex: 3 }),
        ]),
      })
    );
  });

  it('respects maxBatches configuration', async () => {
    const alerts = makeAlerts(20);

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 3, maxBatches: 2, concurrency: 1 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockGetGraph).toHaveBeenCalledTimes(2);
  });

  it('handles batch failures gracefully without losing other batch results', async () => {
    const alerts = makeAlerts(6);
    let callCount = 0;

    mockGetGraph.mockImplementation(() => ({
      invoke: jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('LLM timeout');
        }
        return {
          insights: [
            {
              alertIds: ['alert-0'],
              title: 'Discovery',
              detailsMarkdown: 'details',
              summaryMarkdown: 'summary',
            },
          ],
          anonymizedDocuments: [],
          errors: [],
          replacements: {},
        };
      }),
    }));

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 3, concurrency: 1 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockMergeDiscoveries).toHaveBeenCalledWith(
      expect.objectContaining({
        batchResults: expect.arrayContaining([
          expect.objectContaining({
            batchIndex: 0,
            attackDiscoveries: expect.any(Array),
          }),
          expect.objectContaining({
            batchIndex: 1,
            attackDiscoveries: [],
            errors: ['LLM timeout'],
          }),
        ]),
      })
    );
  });

  it('runs batches concurrently based on concurrency setting', async () => {
    const alerts = makeAlerts(12);
    const invocationTimes: number[] = [];

    mockGetGraph.mockImplementation(() => ({
      invoke: jest.fn().mockImplementation(async () => {
        invocationTimes.push(Date.now());
        await new Promise((r) => setTimeout(r, 10));
        return {
          insights: [],
          anonymizedDocuments: [],
          errors: [],
          replacements: {},
        };
      }),
    }));

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 3, concurrency: 2 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    expect(mockGetGraph).toHaveBeenCalledTimes(4);
  });

  it('passes pre-retrieved alerts directly to the graph (skipping retriever)', async () => {
    const alerts = makeAlerts(3);

    await runBatchedAttackDiscovery({
      anonymizedAlerts: alerts,
      anonymizationFields: [],
      batchConfig: { batchSize: 50 },
      esClient: mockEsClient,
      llm: mockLlm,
      logger: mockLogger,
      prompts: mockPrompts,
    });

    const graphInvokeCall = mockGetGraph.mock.results[0].value.invoke;
    expect(graphInvokeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymizedDocuments: alerts,
      }),
      expect.any(Object)
    );
  });
});
