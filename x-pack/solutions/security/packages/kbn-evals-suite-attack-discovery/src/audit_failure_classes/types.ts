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
  /**
   * Groups whose alerts alone establish malicious activity. Containment advice that cites only
   * these groups is not scored by `ConditionalRemediation`; advice that cites anything else is.
   */
  confirmedGroups: readonly string[];
  /** Groups made of threshold/aggregate alerts, which count other alerts and are not evidence. */
  metaAlertGroups?: readonly string[];
}

export interface AuditScenario {
  id: string;
  description: string;
  provenance: 'authored';
  alerts: readonly AuditAlert[];
  gold: AuditGold;
}

/**
 * Gold is deliberately not carried here: evaluators look it up in the registry by `scenarioId`,
 * so stored score rows hold only the identifiers.
 */
export interface AuditExampleMetadata extends Record<string, unknown> {
  Title: string;
  scenarioId: string;
  inputVariant: AuditInputVariant;
  provenance: 'authored';
}

export type { AnonymizedAlert };
