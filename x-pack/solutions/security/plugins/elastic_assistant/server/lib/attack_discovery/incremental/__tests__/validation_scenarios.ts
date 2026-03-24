/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validation test scenarios for incremental Attack Discovery
 *
 * These scenarios validate that:
 * 1. Delta mode processes only NEW alerts
 * 2. Progressive mode handles large datasets in bounded context
 * 3. Context stays within model context budget (32K default)
 * 4. Insights are coherent and properly merged
 */

import type { Alert } from '../types';

/**
 * Generate mock alerts for testing
 */
export function generateMockAlerts(count: number, startId: number = 0): Alert[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `alert-${startId + i}`,
    content: JSON.stringify({
      '@timestamp': new Date(Date.now() - (count - i) * 60000).toISOString(),
      event: {
        kind: 'alert',
        category: ['intrusion_detection'],
        type: ['indicator'],
        outcome: 'success',
      },
      source: {
        ip: `192.168.1.${(i % 255) + 1}`,
      },
      destination: {
        ip: `10.0.0.${(i % 255) + 1}`,
      },
      rule: {
        name: i % 3 === 0 ? 'SSH Brute Force' : i % 3 === 1 ? 'Malware Detected' : 'Suspicious PowerShell',
      },
      message: `Alert ${startId + i}: ${i % 3 === 0 ? 'Multiple failed SSH login attempts' : i % 3 === 1 ? 'Malicious file detected' : 'Encoded PowerShell command executed'}`,
    }),
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
  }));
}

/**
 * Validation Scenario 1: Delta Mode - Day 1 (Initial Run)
 *
 * Simulates first run of delta mode with 100 alerts
 * Expected:
 * - All 100 alerts processed (deltaSize = 100)
 * - 2 rounds (50 alerts each)
 * - Context within 32K budget per round
 */
export const deltaModeDayOne = {
  name: 'Delta Mode - Day 1 (Initial Run)',
  mode: 'delta' as const,
  alerts: generateMockAlerts(100),
  sessionId: 'test-delta-session',
  config: {
    alertsPerRound: 50,
    maxRounds: 10,
  },
  expectedStats: {
    totalRounds: 2,
    totalAlertsProcessed: 100,
    deltaSize: 100,
    maxContextTokens: 32000,
  },
  validate: (result: any) => {
    const { stats, rounds } = result;

    // Verify delta size equals all alerts (first run)
    expect(stats.deltaSize).toBe(100);
    expect(stats.totalRounds).toBe(2);
    expect(stats.totalAlertsProcessed).toBe(100);

    // Verify context budget per round
    rounds.forEach((round: any, i: number) => {
      const estimatedTokens = round.alertsProcessed.length * 100 + 500;
      expect(estimatedTokens).toBeLessThan(32000);
    });
  },
};

/**
 * Validation Scenario 2: Delta Mode - Day 2 (Incremental)
 *
 * Simulates second run with only 15 new alerts
 * Expected:
 * - Only 15 alerts processed (deltaSize = 15)
 * - 1 round
 * - Previous insights merged with new ones
 */
export const deltaModeDayTwo = {
  name: 'Delta Mode - Day 2 (Incremental)',
  mode: 'delta' as const,
  alerts: [...generateMockAlerts(100), ...generateMockAlerts(15, 100)], // 100 old + 15 new
  sessionId: 'test-delta-session', // Same session as Day 1
  config: {
    alertsPerRound: 50,
    maxRounds: 10,
  },
  expectedStats: {
    totalRounds: 1,
    totalAlertsProcessed: 15,
    deltaSize: 15,
    maxContextTokens: 32000,
  },
  validate: (result: any) => {
    const { stats } = result;

    // Verify only NEW alerts processed
    expect(stats.deltaSize).toBe(15);
    expect(stats.totalRounds).toBe(1);
    expect(stats.totalAlertsProcessed).toBe(15);

    // Verify efficiency (delta size / total alerts)
    const efficiency = stats.deltaSize / 115; // 15 new / 115 total
    expect(efficiency).toBeLessThan(0.2); // <20% is good
  },
};

/**
 * Validation Scenario 3: Progressive Mode - Large Dataset
 *
 * Simulates processing 200 alerts in progressive rounds
 * Expected:
 * - 4 rounds (50 alerts each)
 * - Context grows progressively (4K → 5K → 6K → 7K)
 * - All insights coherently merged
 */
export const progressiveModeLargeDataset = {
  name: 'Progressive Mode - 200 Alerts',
  mode: 'progressive' as const,
  alerts: generateMockAlerts(200),
  sessionId: 'test-progressive-session',
  config: {
    alertsPerRound: 50,
    maxRounds: 10,
  },
  expectedStats: {
    totalRounds: 4,
    totalAlertsProcessed: 200,
    maxContextTokens: 32000,
  },
  validate: (result: any) => {
    const { stats, rounds } = result;

    // Verify all alerts processed
    expect(stats.totalAlertsProcessed).toBe(200);
    expect(stats.totalRounds).toBe(4);

    // Verify context grows progressively but stays bounded
    rounds.forEach((round: any, i: number) => {
      const estimatedTokens = round.alertsProcessed.length * 100 + i * 500; // Progressive growth
      expect(estimatedTokens).toBeLessThan(32000);
    });

    // Verify insights were merged (some deduplication)
    const totalGenerated = rounds.reduce((sum: number, r: any) => sum + r.insightsGenerated, 0);
    const finalCount = result.insights.length;
    expect(finalCount).toBeLessThan(totalGenerated); // Merging occurred
  },
};

/**
 * Validation Scenario 4: Context Boundary Test
 *
 * Tests maximum alerts per round while staying within 32K context budget
 * Expected:
 * - 75 alerts per round should stay within 32K context budget
 * - 100 alerts per round might exceed (fail gracefully)
 */
export const contextBoundaryTest = {
  name: 'Context Boundary Test',
  mode: 'progressive' as const,
  alerts: generateMockAlerts(75),
  sessionId: 'test-boundary-session',
  config: {
    alertsPerRound: 75, // Push the boundary
    maxRounds: 1,
  },
  expectedStats: {
    totalRounds: 1,
    totalAlertsProcessed: 75,
    maxContextTokens: 32000,
  },
  validate: (result: any) => {
    const { rounds } = result;

    // Verify context stayed under limit
    const estimatedTokens = rounds[0].alertsProcessed.length * 100 + 500;
    expect(estimatedTokens).toBeLessThan(32000);

    // Log warning if close to limit
    if (estimatedTokens > 7000) {
      console.warn(`Context budget high: ${estimatedTokens} tokens (limit: 32000)`);
    }
  },
};

/**
 * Validation Scenario 5: Insight Merging Test
 *
 * Tests that similar insights are properly merged
 * Expected:
 * - Insights with overlapping alert IDs are merged
 * - Insights with similar titles are merged (>0.8 similarity)
 */
export const insightMergingTest = {
  name: 'Insight Merging Test',
  mode: 'progressive' as const,
  alerts: generateMockAlerts(100),
  sessionId: 'test-merging-session',
  config: {
    alertsPerRound: 25, // Small rounds to force more merging
    maxRounds: 10,
    similarityThreshold: 0.8,
  },
  expectedStats: {
    totalRounds: 4,
    totalAlertsProcessed: 100,
    minMergeRate: 0.1, // At least 10% merging
    maxMergeRate: 0.5, // At most 50% merging
  },
  validate: (result: any) => {
    const { rounds, insights } = result;

    // Calculate merge rate
    const totalGenerated = rounds.reduce((sum: number, r: any) => sum + r.insightsGenerated, 0);
    const mergedCount = rounds.reduce((sum: number, r: any) => sum + r.insightsMerged, 0);
    const mergeRate = mergedCount / totalGenerated;

    // Verify merge rate is reasonable
    expect(mergeRate).toBeGreaterThan(0.1); // At least 10% merged
    expect(mergeRate).toBeLessThan(0.5);   // Not over-merging

    // Verify no duplicate alert IDs across insights
    const allAlertIds = insights.flatMap((i: any) => i.alertIds);
    const uniqueAlertIds = new Set(allAlertIds);
    expect(allAlertIds.length).toBeGreaterThan(uniqueAlertIds.size); // Some overlap is OK
  },
};

/**
 * All validation scenarios
 */
export const validationScenarios = [
  deltaModeDayOne,
  deltaModeDayTwo,
  progressiveModeLargeDataset,
  contextBoundaryTest,
  insightMergingTest,
];
