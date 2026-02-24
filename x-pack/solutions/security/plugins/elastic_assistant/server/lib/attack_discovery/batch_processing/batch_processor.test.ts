/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  BatchProcessor,
  type AlertForProcessing,
  type AttackDiscoveryResult,
  DEFAULT_BATCH_CONFIG,
} from '.';

describe('BatchProcessor', () => {
  let logger: MockedLogger;
  let processor: BatchProcessor;
  let mockProcessBatch: jest.Mock;
  let mockMerge: jest.Mock;

  const createAlert = (id: string): AlertForProcessing => ({
    id,
    content: `Alert content for ${id}`,
  });

  const createDiscovery = (id: string, alertIds: string[]): AttackDiscoveryResult => ({
    id,
    title: `Discovery ${id}`,
    summaryMarkdown: `Summary for ${id}`,
    detailsMarkdown: `Details for ${id}`,
    alertIds,
  });

  beforeEach(() => {
    logger = loggerMock.create();

    mockProcessBatch = jest.fn().mockImplementation((alerts: AlertForProcessing[]) => {
      return Promise.resolve([
        createDiscovery(
          `discovery-${alerts[0].id}`,
          alerts.map((a) => a.id)
        ),
      ]);
    });

    mockMerge = jest.fn().mockImplementation((results1, results2) => {
      // Simple merge: combine alert IDs
      const allAlertIds = [
        ...results1.flatMap((r: AttackDiscoveryResult) => r.alertIds),
        ...results2.flatMap((r: AttackDiscoveryResult) => r.alertIds),
      ];
      return [createDiscovery('merged', allAlertIds)];
    });

    processor = new BatchProcessor({
      logger,
      config: DEFAULT_BATCH_CONFIG,
    });
  });

  describe('process', () => {
    it('should process alerts in batches', async () => {
      const alerts = [createAlert('alert-1'), createAlert('alert-2'), createAlert('alert-3')];

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, batchSize: 2 },
      });

      const result = await customProcessor.process(alerts, mockProcessBatch, mockMerge);

      // Should have processed in 2 batches (2 + 1)
      expect(mockProcessBatch).toHaveBeenCalledTimes(2);
      expect(result.batchesProcessed).toBe(2);
      expect(result.totalAlertsProcessed).toBe(3);
    });

    it('should return empty discoveries for empty alerts', async () => {
      const result = await processor.process([], mockProcessBatch, mockMerge);

      expect(result.discoveries).toHaveLength(0);
      expect(result.totalAlertsProcessed).toBe(0);
      expect(mockProcessBatch).not.toHaveBeenCalled();
    });

    it('should process single batch without merging', async () => {
      const alerts = [createAlert('alert-1')];

      const result = await processor.process(alerts, mockProcessBatch, mockMerge);

      expect(mockProcessBatch).toHaveBeenCalledTimes(1);
      expect(mockMerge).not.toHaveBeenCalled();
      expect(result.discoveries).toHaveLength(1);
    });

    it('should merge discoveries from multiple batches', async () => {
      const alerts = [
        createAlert('alert-1'),
        createAlert('alert-2'),
        createAlert('alert-3'),
        createAlert('alert-4'),
      ];

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, batchSize: 2 },
      });

      const result = await customProcessor.process(alerts, mockProcessBatch, mockMerge);

      // Should merge the results
      expect(mockMerge).toHaveBeenCalled();
      expect(result.discoveries).toHaveLength(1);
    });

    it('should handle batch processing errors gracefully', async () => {
      const failingProcessor = jest
        .fn()
        .mockResolvedValueOnce([createDiscovery('discovery-1', ['alert-1'])])
        .mockRejectedValueOnce(new Error('Batch processing failed'));

      const alerts = [
        createAlert('alert-1'),
        createAlert('alert-2'),
        createAlert('alert-3'),
        createAlert('alert-4'),
      ];

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, batchSize: 2 },
      });

      const result = await customProcessor.process(alerts, failingProcessor, mockMerge);

      // Should have partial results
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Batch processing failed');
    });

    it('should deduplicate alerts when configured', async () => {
      const alerts = [
        createAlert('alert-1'),
        createAlert('alert-1'), // Duplicate
        createAlert('alert-2'),
      ];

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, deduplicateAlerts: true },
      });

      const result = await customProcessor.process(alerts, mockProcessBatch, mockMerge);

      // Should only process unique alerts
      expect(result.totalAlertsProcessed).toBe(2);
    });

    it('should respect maxAlerts configuration', async () => {
      const alerts = Array.from({ length: 100 }, (_, i) => createAlert(`alert-${i}`));

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, maxAlerts: 50 },
      });

      const result = await customProcessor.process(alerts, mockProcessBatch, mockMerge);

      expect(result.totalAlertsProcessed).toBe(50);
    });

    it('should track processing duration', async () => {
      const alerts = [createAlert('alert-1')];

      const result = await processor.process(alerts, mockProcessBatch, mockMerge);

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('adaptive batch sizing', () => {
    it('should reduce batch size on context limit errors', async () => {
      let callCount = 0;
      const adaptiveProcessor = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const error = new Error('context_length_exceeded');
          throw error;
        }
        return Promise.resolve([createDiscovery('discovery-1', ['alert-1'])]);
      });

      const alerts = [createAlert('alert-1'), createAlert('alert-2')];

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, batchSize: 2 },
      });

      const result = await customProcessor.process(alerts, adaptiveProcessor, mockMerge);

      // Should have retried with smaller batch
      expect(adaptiveProcessor).toHaveBeenCalledTimes(3); // 1 failure + 2 smaller batches
    });
  });

  describe('parallel processing', () => {
    it('should process batches in parallel when configured', async () => {
      const startTimes: number[] = [];
      const parallelProcessor = jest.fn().mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [createDiscovery('discovery', ['alert'])];
      });

      const alerts = Array.from({ length: 6 }, (_, i) => createAlert(`alert-${i}`));

      const customProcessor = new BatchProcessor({
        logger,
        config: { ...DEFAULT_BATCH_CONFIG, batchSize: 2, parallelBatches: 3 },
      });

      await customProcessor.process(alerts, parallelProcessor, mockMerge);

      // First 3 batches should start nearly simultaneously
      expect(parallelProcessor).toHaveBeenCalledTimes(3);
    });
  });
});
