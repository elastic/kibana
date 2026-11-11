/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnonymizedAlert } from '../types';

/**
 * `baseline` renders only fields in the product default anonymization allowlist, with no
 * additional context. `enriched` adds identity fields the allowlist omits, still with no
 * additional context. `enriched_context` renders exactly what `enriched` does and adds the
 * scenario's `operatorContext`.
 */
export type AuditInputVariant = 'baseline' | 'enriched' | 'enriched_context';

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
   * Alternative to `requiredGroup` for input that cannot tell the groups apart: recovering any
   * one of these groups counts (best recall over them).
   */
  requiredAnyOf?: readonly string[];
  /**
   * Per-variant replacement of the recall target, for scenarios where the input of one variant
   * cannot support the gold of another. An override replaces both `requiredGroup` and
   * `requiredAnyOf`.
   */
  variantOverrides?: Partial<
    Record<AuditInputVariant, Pick<AuditGold, 'requiredGroup' | 'requiredAnyOf'>>
  >;
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
  /**
   * Additional context sent in the `enriched_context` variant only. Written as facts an operator
   * would configure about the environment; it must not say how to link entities or what is
   * malicious (`registry.test.ts` guards against hinting).
   */
  operatorContext: string;
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
