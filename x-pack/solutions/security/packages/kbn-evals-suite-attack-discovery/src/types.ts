/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Example } from '@kbn/evals';

export type AttackDiscoveryInputMode =
  | 'bundledAlerts'
  | 'searchAlerts'
  | 'graphState'
  | 'incrementalProgressive';

export interface AnonymizedAlert {
  pageContent: string;
  metadata: Record<string, unknown>;
}

export interface AttackDiscoveryBundledAlertsInput extends Record<string, unknown> {
  mode: 'bundledAlerts';
  anonymizedAlerts: ReadonlyArray<AnonymizedAlert>;
}

export interface AttackDiscoverySearchAlertsInput extends Record<string, unknown> {
  mode: 'searchAlerts';
  /**
   * Optional knobs. The base implementation applies defaults.
   */
  alertsIndexPattern?: string;
  start?: string;
  end?: string;
  size?: number;
  filter?: Record<string, unknown>;
}

export interface AttackDiscoveryGraphStateInput extends Record<string, unknown> {
  mode: 'graphState';
  /**
   * A partial “graph-state-like” input used for prompt construction.
   * The base implementation fills helpful defaults.
   */
  anonymizedAlerts?: ReadonlyArray<AnonymizedAlert>;
  prompt?: string;
  continuePrompt?: string;
  combinedMaybePartialResults?: string;
}

export interface AttackDiscoveryIncrementalProgressiveInput extends Record<string, unknown> {
  mode: 'incrementalProgressive';
  anonymizedAlerts: ReadonlyArray<AnonymizedAlert>;
  alertsPerRound: number;
  maxRounds: number;
  qualityOptions?: {
    synthesisPass?: boolean;
    clusterAlerts?: boolean;
    progressiveContext?: boolean;
    adaptiveBatchSize?: boolean;
  };
}

export interface AttackDiscoveryIncrementalDeltaInput extends Record<string, unknown> {
  mode: 'incrementalDelta';
  /** All current alerts (old + new) */
  anonymizedAlerts: ReadonlyArray<AnonymizedAlert>;
  /** Alerts already processed in a previous run */
  previouslyProcessedCount: number;
  alertsPerRound: number;
  maxRounds: number;
}

export type AttackDiscoveryTaskInput =
  | AttackDiscoveryBundledAlertsInput
  | AttackDiscoverySearchAlertsInput
  | AttackDiscoveryGraphStateInput
  | AttackDiscoveryIncrementalProgressiveInput
  | AttackDiscoveryIncrementalDeltaInput;

export interface AttackDiscoveryTaskExpectedOutput {
  attackDiscoveries: AttackDiscovery[];
}

export interface RoundMetrics {
  roundNumber: number;
  alertCount: number;
  insightCount: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AttackDiscoveryTaskOutput {
  insights: AttackDiscovery[] | null;
  errors?: string[];
  raw?: unknown;
  rounds?: RoundMetrics[];
  metadata?: {
    latency?: {
      startTime: number;
      endTime: number;
      durationMs: number;
    };
    tokens?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
  };
}

export type AttackDiscoveryDatasetMetadata = Record<string, unknown> & {
  Title?: string;
  dataset_split?: unknown;
};

export type AttackDiscoveryDatasetExample = Example<
  AttackDiscoveryTaskInput,
  AttackDiscoveryTaskExpectedOutput,
  AttackDiscoveryDatasetMetadata
>;
