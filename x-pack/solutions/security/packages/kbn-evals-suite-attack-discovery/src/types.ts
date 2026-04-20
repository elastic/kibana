/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Example } from '@kbn/evals';

export type AttackDiscoveryInputMode = 'bundledAlerts' | 'searchAlerts' | 'graphState';

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

export type AttackDiscoveryTaskInput =
  | AttackDiscoveryBundledAlertsInput
  | AttackDiscoverySearchAlertsInput
  | AttackDiscoveryGraphStateInput;

export interface AttackDiscoveryTaskExpectedOutput {
  attackDiscoveries: AttackDiscovery[];
}

export interface AttackDiscoveryTaskOutput {
  insights: AttackDiscovery[] | null;
  errors?: string[];
  raw?: unknown;
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
