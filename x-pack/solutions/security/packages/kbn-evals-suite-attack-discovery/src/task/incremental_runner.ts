/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput, RoundMetrics } from '../types';

interface DeltaRunnerParams {
  log: ToolingLog;
  allAlerts: ReadonlyArray<AnonymizedAlert>;
  previouslyProcessedCount: number;
  alertsPerRound: number;
  maxRounds: number;
  generateRoundInsights: (
    roundAlerts: string[],
    previousInsights: AttackDiscovery[]
  ) => Promise<{
    insights: AttackDiscovery[];
    usage?: { inputTokens: number; outputTokens: number };
  }>;
}

interface IncrementalRunnerParams {
  log: ToolingLog;
  alerts: ReadonlyArray<AnonymizedAlert>;
  alertsPerRound: number;
  maxRounds: number;
  generateRoundInsights: (
    roundAlerts: string[],
    previousInsights: AttackDiscovery[]
  ) => Promise<{
    insights: AttackDiscovery[];
    usage?: { inputTokens: number; outputTokens: number };
  }>;
}

const titleSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

const STOP_WORDS = new Set(['the', 'and', 'of', 'in', 'a', 'to', 'is', 'for', 'on', 'with']);

const countCommonMeaningfulWords = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter((w) => w && !STOP_WORDS.has(w)));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter((w) => w && !STOP_WORDS.has(w)));
  return [...wordsA].filter((w) => wordsB.has(w)).length;
};

const mergeInsights = (
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  threshold = 0.6
): AttackDiscovery[] => {
  const merged = [...existing];

  for (const insight of newInsights) {
    const matchIdx = merged.findIndex((e) => {
      // Only merge on significant alert ID overlap (>= 30%)
      const sharedIds = e.alertIds.filter((id) => insight.alertIds.includes(id));
      const overlapRatio = sharedIds.length / Math.min(e.alertIds.length, insight.alertIds.length || 1);
      if (overlapRatio >= 0.3) return true;

      // Prevent merging insights with very different alert coverage
      const sizeDiff = Math.abs(e.alertIds.length - insight.alertIds.length);
      const maxSize = Math.max(e.alertIds.length, insight.alertIds.length, 1);
      if (sizeDiff / maxSize > 0.7) return false;

      // Title similarity + meaningful word overlap
      if (titleSimilarity(e.title, insight.title) >= threshold) {
        return countCommonMeaningfulWords(e.title, insight.title) >= 2;
      }
      return false;
    });

    if (matchIdx >= 0) {
      const match = merged[matchIdx];
      merged[matchIdx] = {
        ...match,
        alertIds: Array.from(new Set([...match.alertIds, ...insight.alertIds])),
        summaryMarkdown: `${match.summaryMarkdown}\n\n${insight.summaryMarkdown}`,
        detailsMarkdown: `${match.detailsMarkdown}\n\n${insight.detailsMarkdown}`,
      };
    } else {
      merged.push(insight);
    }
  }

  return merged;
};

export const runIncrementalProgressive = async ({
  log,
  alerts,
  alertsPerRound,
  maxRounds,
  generateRoundInsights,
}: IncrementalRunnerParams): Promise<AttackDiscoveryTaskOutput> => {
  const startTime = Date.now();
  const rounds: RoundMetrics[] = [];
  let currentInsights: AttackDiscovery[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const alertStrings = alerts.map((a) => a.pageContent);
  const totalRounds = Math.min(Math.ceil(alertStrings.length / alertsPerRound), maxRounds);

  log.info(
    `Incremental progressive: ${alertStrings.length} alerts, ${alertsPerRound}/round, ${totalRounds} rounds`
  );

  for (let i = 0; i < totalRounds; i++) {
    const roundStart = Date.now();
    const roundAlerts = alertStrings.slice(i * alertsPerRound, (i + 1) * alertsPerRound);
    const roundNumber = i + 1;

    log.info(`Round ${roundNumber}/${totalRounds}: processing ${roundAlerts.length} alerts`);

    const { insights: newInsights, usage } = await generateRoundInsights(
      roundAlerts,
      currentInsights
    );

    currentInsights = mergeInsights(currentInsights, newInsights);

    const roundDuration = Date.now() - roundStart;
    totalInputTokens += usage?.inputTokens ?? 0;
    totalOutputTokens += usage?.outputTokens ?? 0;

    rounds.push({
      roundNumber,
      alertCount: roundAlerts.length,
      insightCount: newInsights.length,
      durationMs: roundDuration,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    });

    log.info(
      `Round ${roundNumber} complete: ${newInsights.length} insights, ${usage.inputTokens + usage.outputTokens} tokens, ${roundDuration}ms`
    );
  }

  const endTime = Date.now();

  return {
    insights: currentInsights,
    rounds,
    metadata: {
      latency: { startTime, endTime, durationMs: endTime - startTime },
      tokens: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
    },
  };
};

/**
 * Delta mode: simulates processing only NEW alerts since a previous run.
 * Skips the first `previouslyProcessedCount` alerts and processes the rest.
 */
export const runIncrementalDelta = async ({
  log,
  allAlerts,
  previouslyProcessedCount,
  alertsPerRound,
  maxRounds,
  generateRoundInsights,
}: DeltaRunnerParams): Promise<AttackDiscoveryTaskOutput> => {
  const alertStrings = allAlerts.map((a) => a.pageContent);
  const deltaAlerts = alertStrings.slice(previouslyProcessedCount);
  const deltaSize = deltaAlerts.length;

  log.info(
    `Incremental delta: ${alertStrings.length} total alerts, ${previouslyProcessedCount} previously processed, ${deltaSize} new (delta)`
  );

  if (deltaSize === 0) {
    log.info('No new alerts — returning empty result');
    return {
      insights: [],
      rounds: [],
      metadata: {
        latency: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 },
        tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    };
  }

  // Process only the delta alerts using the progressive runner
  return runIncrementalProgressive({
    log,
    alerts: deltaAlerts.map((content) => ({ pageContent: content, metadata: {} })),
    alertsPerRound,
    maxRounds,
    generateRoundInsights,
  });
};
