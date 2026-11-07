/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import type { Example } from '@kbn/evals';

export interface AnonymizedAlert {
  pageContent: string;
  metadata: Record<string, unknown>;
}

export interface AttackDiscoveryBundledAlertsInput extends Record<string, unknown> {
  mode: 'bundledAlerts';
  anonymizedAlerts: ReadonlyArray<AnonymizedAlert>;
  additionalContext?: string;
}

export type AttackDiscoveryTaskInput = AttackDiscoveryBundledAlertsInput;

export interface AttackDiscoveryTaskExpectedOutput {
  attackDiscoveries: AttackDiscovery[];
  criteria?: string[];
}

export interface AttackDiscoveryTaskOutput {
  insights: AttackDiscovery[] | null;
  errors?: string[];
  raw?: unknown;
  traceId?: string;
}

export type AttackDiscoveryDatasetMetadata = Record<string, unknown> & {
  Title?: string;
  dataset_split?: unknown;
  is_distractor?: boolean;
  criteria?: string[];
};

export type AttackDiscoveryDatasetExample = Example<
  AttackDiscoveryTaskInput,
  AttackDiscoveryTaskExpectedOutput,
  AttackDiscoveryDatasetMetadata
>;
