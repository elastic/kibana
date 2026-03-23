/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AnonymizedAlert, AttackDiscoveryTaskOutput, RoundMetrics } from '../types';

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
    usage: { inputTokens: number; outputTokens: number };
  }>;
}

const titleSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

const mergeInsights = (
  existing: AttackDiscovery[],
  newInsights: AttackDiscovery[],
  threshold = 0.8
): AttackDiscovery[] => {
  const merged = [...existing];

  for (const insight of newInsights) {
    const matchIdx = merged.findIndex((e) => {
      const hasOverlap = e.alertIds.some((id) => insight.alertIds.includes(id));
      if (hasOverlap) return true;
      return titleSimilarity(e.title, insight.title) >= threshold;
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
    totalInputTokens += usage.inputTokens;
    totalOutputTokens += usage.outputTokens;

    rounds.push({
      roundNumber,
      alertCount: roundAlerts.length,
      insightCount: newInsights.length,
      durationMs: roundDuration,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
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
