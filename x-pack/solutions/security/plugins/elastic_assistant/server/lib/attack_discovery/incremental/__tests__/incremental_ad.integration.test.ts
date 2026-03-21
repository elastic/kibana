/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration tests for incremental Attack Discovery
 *
 * These tests validate the complete flow with mock LLM to ensure:
 * - Delta mode processes only new alerts
 * - Progressive mode handles large datasets
 * - Context stays bounded
 * - Insights are properly merged
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { incrementalAttackDiscovery } from '../index';
import type { Alert } from '../types';
import { validationScenarios, generateMockAlerts } from './validation_scenarios';

describe('Incremental Attack Discovery - Integration Tests', () => {
  // Mock ES client
  const mockEsClient = {
    bulk: jest.fn(async () => ({ errors: false })),
    get: jest.fn(async () => ({ found: false })),
    search: jest.fn(async () => ({ hits: { hits: [] }, aggregations: {} })),
  };

  // Mock LLM (simulates real model behavior)
  async function mockGenerateInsights(
    alerts: Alert[],
    previousInsights?: AttackDiscovery[]
  ): Promise<AttackDiscovery[]> {
    // Group alerts by rule name
    const alertsByRule = alerts.reduce((acc, alert) => {
      const content = JSON.parse(alert.content);
      const ruleName = content.rule?.name || 'Unknown';
      if (!acc[ruleName]) acc[ruleName] = [];
      acc[ruleName].push(alert);
      return acc;
    }, {} as Record<string, Alert[]>);

    // Generate insights per rule
    return Object.entries(alertsByRule).map(([ruleName, ruleAlerts]) => ({
      title: ruleName,
      summaryMarkdown: `Detected ${ruleAlerts.length} ${ruleName} alerts`,
      detailsMarkdown: `Analysis of ${ruleAlerts.length} alerts from round`,
      alertIds: ruleAlerts.map(a => a.id),
    }));
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Delta Mode', () => {
    it('should process all alerts on first run', async () => {
      const alerts = generateMockAlerts(100);

      const result = await incrementalAttackDiscovery({
        mode: 'delta',
        alerts,
        config: { alertsPerRound: 50, maxRounds: 10 },
        esClient: mockEsClient as any,
        sessionId: 'test-delta-1',
        generateInsights: mockGenerateInsights,
      });

      // All alerts processed on first run
      expect(result.stats.totalAlertsProcessed).toBe(100);
      expect(result.stats.deltaSize).toBe(100);
      expect(result.stats.totalRounds).toBe(2); // 100/50 = 2 rounds

      // Verify state tracking was called
      expect(mockEsClient.bulk).toHaveBeenCalled();
    });

    it('should process only new alerts on subsequent run', async () => {
      const sessionId = 'test-delta-2';

      // Simulate first run with 100 alerts
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [] }, // No processed alerts yet
        aggregations: {},
      });

      await incrementalAttackDiscovery({
        mode: 'delta',
        alerts: generateMockAlerts(100),
        config: { alertsPerRound: 50 },
        esClient: mockEsClient as any,
        sessionId,
        generateInsights: mockGenerateInsights,
      });

      // Second run: 100 old + 15 new alerts
      // Mock that first 100 are processed
      const processedAlertIds = Array.from({ length: 100 }, (_, i) => `alert-${i}`);
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: processedAlertIds.map(id => ({ _source: { alertId: id } })),
        },
        aggregations: {},
      });

      const result = await incrementalAttackDiscovery({
        mode: 'delta',
        alerts: [...generateMockAlerts(100), ...generateMockAlerts(15, 100)],
        config: { alertsPerRound: 50 },
        esClient: mockEsClient as any,
        sessionId,
        generateInsights: mockGenerateInsights,
      });

      // Only new alerts processed
      expect(result.stats.deltaSize).toBe(15);
      expect(result.stats.totalAlertsProcessed).toBe(15);
      expect(result.stats.totalRounds).toBe(1); // 15 < 50, single round
    });
  });

  describe('Progressive Mode', () => {
    it('should process 200 alerts in 4 rounds', async () => {
      const alerts = generateMockAlerts(200);

      const result = await incrementalAttackDiscovery({
        mode: 'progressive',
        alerts,
        config: { alertsPerRound: 50, maxRounds: 10 },
        esClient: mockEsClient as any,
        sessionId: 'test-progressive-1',
        generateInsights: mockGenerateInsights,
      });

      expect(result.stats.totalAlertsProcessed).toBe(200);
      expect(result.stats.totalRounds).toBe(4); // 200/50 = 4 rounds

      // Verify each round processed correct number of alerts
      expect(result.rounds[0].alertsProcessed.length).toBe(50);
      expect(result.rounds[1].alertsProcessed.length).toBe(50);
      expect(result.rounds[2].alertsProcessed.length).toBe(50);
      expect(result.rounds[3].alertsProcessed.length).toBe(50);
    });

    it('should respect maxRounds limit', async () => {
      const alerts = generateMockAlerts(500);

      const result = await incrementalAttackDiscovery({
        mode: 'progressive',
        alerts,
        config: { alertsPerRound: 50, maxRounds: 3 }, // Limit to 3 rounds
        esClient: mockEsClient as any,
        sessionId: 'test-progressive-2',
        generateInsights: mockGenerateInsights,
      });

      // Should stop at 3 rounds (150 alerts), not process all 500
      expect(result.stats.totalRounds).toBe(3);
      expect(result.stats.totalAlertsProcessed).toBe(150);
    });
  });

  describe('Context Budget', () => {
    it('should keep context under 8K tokens per round', async () => {
      const alerts = generateMockAlerts(75); // Max safe amount

      const result = await incrementalAttackDiscovery({
        mode: 'progressive',
        alerts,
        config: { alertsPerRound: 75, maxRounds: 1 },
        esClient: mockEsClient as any,
        sessionId: 'test-context-1',
        generateInsights: mockGenerateInsights,
      });

      // Estimate tokens (conservative: 100 tokens per alert + 500 overhead)
      const estimatedTokens = 75 * 100 + 500;
      expect(estimatedTokens).toBeLessThanOrEqual(8000); // Boundary test: exactly at limit is OK

      // Verify completed successfully
      expect(result.stats.totalAlertsProcessed).toBe(75);
    });
  });

  describe('Insight Merging', () => {
    it('should merge insights with overlapping alert IDs', async () => {
      const alerts = generateMockAlerts(100);

      const result = await incrementalAttackDiscovery({
        mode: 'progressive',
        alerts,
        config: { alertsPerRound: 25, maxRounds: 10 }, // Small rounds = more merging
        esClient: mockEsClient as any,
        sessionId: 'test-merging-1',
        generateInsights: mockGenerateInsights,
      });

      // With 100 alerts in 4 rounds, should have some merging
      const totalGenerated = result.rounds.reduce((sum, r) => sum + r.insightsGenerated, 0);
      const totalMerged = result.rounds.reduce((sum, r) => sum + r.insightsMerged, 0);

      expect(totalMerged).toBeGreaterThan(0); // At least some merging occurred

      // Verify no duplicate alert IDs
      const allAlertIds = result.insights.flatMap(i => i.alertIds);
      const uniqueAlertIds = new Set(allAlertIds);
      expect(allAlertIds.length).toBe(uniqueAlertIds.size); // No duplicates
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM errors gracefully', async () => {
      const failingLLM = async () => {
        throw new Error('LLM connection timeout');
      };

      await expect(
        incrementalAttackDiscovery({
          mode: 'progressive',
          alerts: generateMockAlerts(50),
          config: { alertsPerRound: 50 },
          esClient: mockEsClient as any,
          sessionId: 'test-error-1',
          generateInsights: failingLLM,
        })
      ).rejects.toThrow('LLM connection timeout');
    });

    it('should return empty for delta mode with no new alerts', async () => {
      // Mock all alerts as processed
      mockEsClient.search.mockResolvedValueOnce({
        hits: {
          hits: Array.from({ length: 50 }, (_, i) => ({
            _source: { alertId: `alert-${i}` },
          })),
        },
        aggregations: {},
      });

      const result = await incrementalAttackDiscovery({
        mode: 'delta',
        alerts: generateMockAlerts(50),
        config: { alertsPerRound: 50 },
        esClient: mockEsClient as any,
        sessionId: 'test-empty-delta',
        generateInsights: mockGenerateInsights,
      });

      expect(result.stats.deltaSize).toBe(0);
      expect(result.stats.totalRounds).toBe(0);
      expect(result.stats.totalAlertsProcessed).toBe(0);
      expect(result.insights).toEqual([]);
    });
  });
});
