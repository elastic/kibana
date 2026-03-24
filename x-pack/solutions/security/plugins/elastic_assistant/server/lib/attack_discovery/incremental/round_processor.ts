/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { mergeInsights } from './insight_merger';
import type { Alert, RoundResult } from './types';

interface ProcessInRoundsParams {
  alerts: Alert[];
  alertsPerRound: number;
  maxRounds: number;
  generateInsights: (alerts: Alert[], previousInsights?: AttackDiscovery[]) => Promise<AttackDiscovery[]>;
  existingInsights: AttackDiscovery[];
  mergeStrategy?: 'rule-based';
}

/**
 * Cluster alerts by content key (host name or rule name) so related alerts
 * stay together in rounds. Eval-validated: improves insight coherence.
 */
function clusterAlerts(alerts: Alert[]): Alert[] {
  const groups = new Map<string, Alert[]>();

  for (const alert of alerts) {
    // Extract grouping key from alert content (CSV format: key,value)
    const hostMatch = alert.content.match(/host\.name,([^\n,]+)/);
    const ruleMatch = alert.content.match(/kibana\.alert\.rule\.name,([^\n,]+)/);
    const key = hostMatch?.[1] ?? ruleMatch?.[1] ?? 'unknown';

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(alert);
  }

  return [...groups.values()].flat();
}

export async function processInRounds({
  alerts,
  alertsPerRound,
  maxRounds,
  generateInsights,
  existingInsights,
  mergeStrategy = 'rule-based',
}: ProcessInRoundsParams): Promise<{ rounds: RoundResult[]; insights: AttackDiscovery[] }> {
  const rounds: RoundResult[] = [];
  let currentInsights = existingInsights;

  // Cluster alerts so related ones are processed together
  const clusteredAlerts = clusterAlerts(alerts);

  let currentBatchSize = alertsPerRound;
  let offset = 0;

  while (offset < clusteredAlerts.length && rounds.length < maxRounds) {
    const roundStartTime = Date.now();
    const roundAlerts = clusteredAlerts.slice(offset, offset + currentBatchSize);
    const roundNumber = rounds.length + 1;

    const newInsights = await generateInsights(roundAlerts, currentInsights);

    const beforeCount = currentInsights.length;
    currentInsights = mergeInsights(currentInsights, newInsights, { strategy: mergeStrategy });

    rounds.push({
      roundNumber,
      alertsProcessed: roundAlerts.map(a => a.id),
      insightsGenerated: newInsights.length,
      insightsMerged: currentInsights.length - beforeCount,
      durationMs: Date.now() - roundStartTime,
    });

    offset += currentBatchSize;

    // Adaptive batch sizing: reduce batch when model produces few insights
    if (newInsights.length <= 1 && currentBatchSize > 15) {
      currentBatchSize = Math.max(15, Math.floor(currentBatchSize * 0.6));
    } else if (newInsights.length >= 5 && currentBatchSize < alertsPerRound) {
      currentBatchSize = Math.min(alertsPerRound, Math.floor(currentBatchSize * 1.3));
    }
  }

  return {
    rounds,
    insights: currentInsights,
  };
}
