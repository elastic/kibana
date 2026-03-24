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
  generateRoundInsights: GenerateRoundFn;
}

type GenerateRoundFn = (
  roundAlerts: string[],
  previousInsights: AttackDiscovery[]
) => Promise<{
  insights: AttackDiscovery[];
  usage?: { inputTokens: number; outputTokens: number };
}>;

export interface QualityOptions {
  /** #1: Final synthesis pass after all rounds */
  synthesisPass?: boolean;
  /** #2: Cluster alerts by host/rule before splitting into rounds */
  clusterAlerts?: boolean;
  /** #3: Inject previous round summaries into context */
  progressiveContext?: boolean;
  /** #4: Adapt batch size based on insight count */
  adaptiveBatchSize?: boolean;
}

interface IncrementalRunnerParams {
  log: ToolingLog;
  alerts: ReadonlyArray<AnonymizedAlert>;
  alertsPerRound: number;
  maxRounds: number;
  generateRoundInsights: GenerateRoundFn;
  qualityOptions?: QualityOptions;
}

const STOP_WORDS = new Set(['the', 'and', 'of', 'in', 'a', 'to', 'is', 'for', 'on', 'with']);

const titleSimilarity = (a: string, b: string): number => {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

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
      const sharedIds = e.alertIds.filter((id) => insight.alertIds.includes(id));
      const overlapRatio =
        sharedIds.length / Math.min(e.alertIds.length, insight.alertIds.length || 1);
      if (overlapRatio >= 0.3) return true;

      const sizeDiff = Math.abs(e.alertIds.length - insight.alertIds.length);
      const maxSize = Math.max(e.alertIds.length, insight.alertIds.length, 1);
      if (sizeDiff / maxSize > 0.7) return false;

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

/**
 * #2: Cluster alerts by host/rule name so related alerts stay together in rounds.
 * Extracts host.name or rule.name from CSV-formatted alert content.
 */
function clusterAlertsByKey(alertStrings: string[]): string[] {
  const groups = new Map<string, string[]>();

  for (const alert of alertStrings) {
    // Extract host.name or rule.name from CSV content (first match)
    const hostMatch = alert.match(/host\.name,([^\n,]+)/);
    const ruleMatch = alert.match(/kibana\.alert\.rule\.name,([^\n,]+)/);
    const key = hostMatch?.[1] ?? ruleMatch?.[1] ?? 'unknown';

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(alert);
  }

  // Return alerts grouped by key — related alerts are adjacent
  return [...groups.values()].flat();
}

/**
 * #3: Build a compact context string summarizing previous round insights.
 */
function buildProgressiveContext(insights: AttackDiscovery[]): string {
  if (insights.length === 0) return '';

  const summary = insights
    .map((i) => `- "${i.title}" (${i.alertIds.length} alerts)`)
    .join('\n');

  return `\n\nPreviously identified attack patterns:\n${summary}\nIdentify NEW patterns not covered above.`;
}

export const runIncrementalProgressive = async ({
  log,
  alerts,
  alertsPerRound,
  maxRounds,
  generateRoundInsights,
  qualityOptions = {},
}: IncrementalRunnerParams): Promise<AttackDiscoveryTaskOutput> => {
  const startTime = Date.now();
  const rounds: RoundMetrics[] = [];
  let currentInsights: AttackDiscovery[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let currentBatchSize = alertsPerRound;

  // #2: Cluster alerts if enabled
  let alertStrings = alerts.map((a) => a.pageContent);
  if (qualityOptions.clusterAlerts) {
    log.info('Clustering alerts by host/rule name');
    alertStrings = clusterAlertsByKey(alertStrings);
  }

  const totalRounds = Math.min(Math.ceil(alertStrings.length / currentBatchSize), maxRounds);
  log.info(
    `Incremental progressive: ${alertStrings.length} alerts, ${currentBatchSize}/round, ~${totalRounds} rounds`
  );

  let offset = 0;
  let roundNumber = 0;

  while (offset < alertStrings.length && roundNumber < maxRounds) {
    const roundStart = Date.now();
    const roundAlerts = alertStrings.slice(offset, offset + currentBatchSize);
    roundNumber++;

    // #3: Inject progressive context if enabled
    let enrichedAlerts = roundAlerts;
    if (qualityOptions.progressiveContext && currentInsights.length > 0) {
      const ctx = buildProgressiveContext(currentInsights);
      // Append context as the last "alert" — the model will see it as additional input
      enrichedAlerts = [...roundAlerts, ctx];
      log.info(`Injecting progressive context: ${currentInsights.length} previous insights`);
    }

    log.info(`Round ${roundNumber}: processing ${roundAlerts.length} alerts (batch=${currentBatchSize})`);

    const { insights: newInsights, usage } = await generateRoundInsights(
      enrichedAlerts,
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
      `Round ${roundNumber} complete: ${newInsights.length} insights, ${(usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)} tokens, ${roundDuration}ms`
    );

    offset += currentBatchSize;

    // #4: Adaptive batch sizing
    if (qualityOptions.adaptiveBatchSize) {
      if (newInsights.length <= 1 && currentBatchSize > 15) {
        currentBatchSize = Math.max(15, Math.floor(currentBatchSize * 0.6));
        log.info(`Adaptive: reducing batch to ${currentBatchSize} (only ${newInsights.length} insight)`);
      } else if (newInsights.length >= 5 && currentBatchSize < alertsPerRound) {
        currentBatchSize = Math.min(alertsPerRound, Math.floor(currentBatchSize * 1.3));
        log.info(`Adaptive: increasing batch to ${currentBatchSize} (${newInsights.length} insights)`);
      }
    }
  }

  // #1: Synthesis pass — consolidate all insights into a coherent set
  if (qualityOptions.synthesisPass && currentInsights.length > 1) {
    log.info(`Synthesis pass: consolidating ${currentInsights.length} insights`);
    const synthStart = Date.now();

    // Build a compact representation of all insights as "alerts" for the synthesis round
    const insightSummaries = currentInsights.map(
      (i, idx) =>
        `Attack #${idx + 1}: "${i.title}"\nAlerts: ${i.alertIds.join(', ')}\nSummary: ${i.summaryMarkdown.slice(0, 200)}`
    );

    try {
      const { insights: synthesized, usage: synthUsage } = await generateRoundInsights(
        insightSummaries,
        []
      );

      if (synthesized.length > 0) {
        log.info(`Synthesis produced ${synthesized.length} consolidated insights`);
        currentInsights = synthesized;

        totalInputTokens += synthUsage?.inputTokens ?? 0;
        totalOutputTokens += synthUsage?.outputTokens ?? 0;

        rounds.push({
          roundNumber: roundNumber + 1,
          alertCount: 0,
          insightCount: synthesized.length,
          durationMs: Date.now() - synthStart,
          inputTokens: synthUsage?.inputTokens ?? 0,
          outputTokens: synthUsage?.outputTokens ?? 0,
        });
      }
    } catch (err) {
      log.warning(`Synthesis pass failed — keeping original insights: ${(err as Error).message}`);
    }
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
    `Incremental delta: ${alertStrings.length} total, ${previouslyProcessedCount} processed, ${deltaSize} new`
  );

  if (deltaSize === 0) {
    return {
      insights: [],
      rounds: [],
      metadata: {
        latency: { startTime: Date.now(), endTime: Date.now(), durationMs: 0 },
        tokens: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    };
  }

  return runIncrementalProgressive({
    log,
    alerts: deltaAlerts.map((content) => ({ pageContent: content, metadata: {} })),
    alertsPerRound,
    maxRounds,
    generateRoundInsights,
  });
};
