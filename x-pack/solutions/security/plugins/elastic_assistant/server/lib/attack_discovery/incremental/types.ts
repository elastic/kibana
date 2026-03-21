/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';

export type IncrementalMode = 'delta' | 'progressive';
export type MergeStrategy = 'rule-based' | 'semantic' | 'hybrid';

export interface IncrementalADConfig {
  mode: IncrementalMode;
  alertsPerRound: number;
  maxRounds: number;
  mergeStrategy: MergeStrategy;
  similarityThreshold: number;
}

export interface ProcessedAlertRecord {
  alertId: string;
  sessionId: string;
  processedAt: string;
  roundNumber: number;
}

export interface IncrementalADState {
  sessionId: string;
  mode: IncrementalMode;
  totalAlertsProcessed: number;
  lastProcessedAt: string;
  currentRound: number;
}

export interface RoundResult {
  roundNumber: number;
  alertsProcessed: string[];
  insightsGenerated: number;
  insightsMerged: number;
  durationMs: number;
}

export interface IncrementalADResult {
  insights: AttackDiscovery[];
  rounds: RoundResult[];
  stats: {
    mode: IncrementalMode;
    totalRounds: number;
    totalAlertsProcessed: number;
    deltaSize?: number;
    durationMs: number;
  };
}

export interface Alert {
  id: string;
  content: string;
  timestamp: string;
}
