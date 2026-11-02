/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnonymizedAlert } from '../types';

/**
 * `baseline` renders only fields in the product default anonymization allowlist.
 * `enriched` adds identity fields the allowlist omits, plus an additional-context block.
 */
export type AuditInputVariant = 'baseline' | 'enriched';

export type AuditExpectedDiscoveries = 'none' | 'atLeastOne';

/** A synthetic alert: a flat, single-valued field map. `_id` is carried separately. */
export interface AuditAlert {
  id: string;
  fields: Readonly<Record<string, string | number>>;
}

/** Gold labels, declared as data per scenario and read by the code evaluators. */
export interface AuditGold {
  /** Named sets of alert ids that belong to one real-world story or principal. */
  alertGroups: Readonly<Record<string, readonly string[]>>;
  /** Pairs of groups that must never be cited by the same discovery. */
  forbiddenCoCitation: ReadonlyArray<readonly [string, string]>;
  expectedDiscoveries: AuditExpectedDiscoveries;
  /** Group whose alert ids a discovery must recover (positive control). */
  requiredGroup?: string;
  /** Whether the alerts alone establish malicious activity. */
  confirmed: boolean;
}

export interface AuditScenario {
  id: string;
  description: string;
  provenance: 'authored';
  alerts: readonly AuditAlert[];
  gold: AuditGold;
}

export interface AuditExampleMetadata extends Record<string, unknown> {
  scenarioId: string;
  inputVariant: AuditInputVariant;
  provenance: 'authored';
  gold: AuditGold;
}

export type { AnonymizedAlert };
