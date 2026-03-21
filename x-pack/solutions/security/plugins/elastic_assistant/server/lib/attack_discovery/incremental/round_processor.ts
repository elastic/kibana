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

  for (let i = 0; i < alerts.length && rounds.length < maxRounds; i += alertsPerRound) {
    const roundStartTime = Date.now();
    const roundAlerts = alerts.slice(i, i + alertsPerRound);
    const roundNumber = rounds.length + 1;

    // Generate insights for this round (with context from previous rounds)
    const newInsights = await generateInsights(roundAlerts, currentInsights);

    // Merge with previous insights
    const beforeCount = currentInsights.length;
    currentInsights = mergeInsights(currentInsights, newInsights, { strategy: mergeStrategy });

    rounds.push({
      roundNumber,
      alertsProcessed: roundAlerts.map(a => a.id),
      insightsGenerated: newInsights.length,
      insightsMerged: currentInsights.length - beforeCount,
      durationMs: Date.now() - roundStartTime,
    });
  }

  return {
    rounds,
    insights: currentInsights,
  };
}
