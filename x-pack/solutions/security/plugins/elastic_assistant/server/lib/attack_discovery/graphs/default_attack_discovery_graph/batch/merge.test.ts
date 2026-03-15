/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';

import { mergeDiscoveries } from './merge';
import type { BatchResult } from './types';
import type { CombinedPrompts } from '../prompts';

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

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

const makeDiscovery = (id: string, alertIds: string[]): AttackDiscovery => ({
  alertIds,
  title: `Discovery ${id}`,
  detailsMarkdown: `Details for ${id}`,
  summaryMarkdown: `Summary for ${id}`,
  entitySummaryMarkdown: `Entity for ${id}`,
  mitreAttackTactics: ['Initial Access'],
});

const makeBatchResult = (
  batchIndex: number,
  discoveries: AttackDiscovery[],
  errors: string[] = []
): BatchResult => ({
  batchIndex,
  attackDiscoveries: discoveries,
  anonymizedAlerts: discoveries.flatMap((d) =>
    d.alertIds.map((id) => ({
      pageContent: `alert-${id}`,
      metadata: {},
    }))
  ),
  replacements: {},
  alertCount: discoveries.reduce((sum, d) => sum + d.alertIds.length, 0),
  durationMs: 1000,
  errors,
});

describe('mergeDiscoveries', () => {
  const mockLlm = {} as ActionsClientLlm;

  describe('when there are no batch results', () => {
    it('returns empty results with zero metrics', async () => {
      const result = await mergeDiscoveries({
        batchResults: [],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.attackDiscoveries).toEqual([]);
      expect(result.anonymizedAlerts).toEqual([]);
      expect(result.mergeMetrics.totalDiscoveriesBeforeMerge).toBe(0);
      expect(result.mergeMetrics.totalDiscoveriesAfterMerge).toBe(0);
      expect(result.mergeMetrics.batchesProcessed).toBe(0);
    });
  });

  describe('when there is a single batch with results', () => {
    it('skips the LLM merge pass and returns results directly', async () => {
      const discoveries = [
        makeDiscovery('A', ['alert-1', 'alert-2']),
        makeDiscovery('B', ['alert-3']),
      ];

      const result = await mergeDiscoveries({
        batchResults: [makeBatchResult(0, discoveries)],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.attackDiscoveries).toHaveLength(2);
      expect(result.mergeMetrics.totalDiscoveriesBeforeMerge).toBe(2);
      expect(result.mergeMetrics.totalDiscoveriesAfterMerge).toBe(2);
      expect(result.mergeMetrics.discoveriesConsolidated).toBe(0);
      expect(result.mergeMetrics.consolidationRatio).toBe(1);
      expect(result.mergeMetrics.batchesProcessed).toBe(1);
    });
  });

  describe('when there are multiple batches but only one has results', () => {
    it('skips the LLM merge pass', async () => {
      const discoveries = [makeDiscovery('A', ['alert-1'])];
      const emptyBatch = makeBatchResult(1, []);

      const result = await mergeDiscoveries({
        batchResults: [makeBatchResult(0, discoveries), emptyBatch],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.attackDiscoveries).toHaveLength(1);
      expect(result.mergeMetrics.batchesProcessed).toBe(2);
    });
  });

  describe('when all batches have errors', () => {
    it('returns empty discoveries and tracks failed batches', async () => {
      const result = await mergeDiscoveries({
        batchResults: [
          makeBatchResult(0, [], ['timeout error']),
          makeBatchResult(1, [], ['rate limit error']),
        ],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.attackDiscoveries).toEqual([]);
      expect(result.mergeMetrics.batchesFailed).toBe(2);
    });
  });

  describe('merge quality metrics', () => {
    it('calculates alert coverage correctly', async () => {
      const batch1 = makeBatchResult(0, [makeDiscovery('A', ['alert-1', 'alert-2'])]);
      const batch2 = makeBatchResult(1, []);

      const result = await mergeDiscoveries({
        batchResults: [batch1, batch2],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.mergeMetrics.totalUniqueAlertIdsBeforeMerge).toBe(2);
      expect(result.mergeMetrics.totalUniqueAlertIdsAfterMerge).toBe(2);
      expect(result.mergeMetrics.alertCoverage).toBe(1);
    });

    it('combines replacements from all batches', async () => {
      const batch1: BatchResult = {
        ...makeBatchResult(0, [makeDiscovery('A', ['alert-1'])]),
        replacements: { uuid1: 'hostname-1' },
      };
      const batch2: BatchResult = {
        ...makeBatchResult(1, []),
        replacements: { uuid2: 'username-1' },
      };

      const result = await mergeDiscoveries({
        batchResults: [batch1, batch2],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.replacements).toEqual({
        uuid1: 'hostname-1',
        uuid2: 'username-1',
      });
    });

    it('accumulates total duration from all batches', async () => {
      const batch1: BatchResult = {
        ...makeBatchResult(0, [makeDiscovery('A', ['alert-1'])]),
        durationMs: 5000,
      };
      const batch2: BatchResult = {
        ...makeBatchResult(1, []),
        durationMs: 3000,
      };

      const result = await mergeDiscoveries({
        batchResults: [batch1, batch2],
        llm: mockLlm,
        logger: mockLogger,
        prompts: mockPrompts,
      });

      expect(result.mergeMetrics.totalDurationMs).toBeGreaterThanOrEqual(8000);
    });
  });
});
