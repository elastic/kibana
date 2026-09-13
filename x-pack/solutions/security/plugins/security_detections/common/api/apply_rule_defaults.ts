/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Detection rule defaults — the API-layer defaults table.
 *
 * Defaults are applied by the API before the framework sees the payload,
 * following v1's `RULE_DEFAULTS` / `applyRuleDefaults` pattern.  They are
 * NOT encoded in Zod `.default()` calls on the builder schemas (which the
 * framework forbids) or on the request schemas (which would silently suppress
 * user mistakes).
 *
 * The table is from the design verbatim, with two deliberate departures from v1:
 *   1. `schedule` defaults to `{ interval: '5m' }` with no `now-6m` overlap.
 *      v1 baked `from: now-6m` into its default — v2 separates them.
 *      A caller who wants v1's overlap sends `lookback: '6m'`.
 *   2. `query` is required non-empty for the `query` type.
 *      v1 defaulted it to `""` (match-all); the new contract treats an empty
 *      query as a mistake and requires a caller to supply one.
 *
 * Ref: rule-domain-model.md "The request shapes" (defaults table)
 */

import type {
  DetectionRuleCreateProps,
  DetectionRuleUpdateProps,
} from './detection_rule_request_schemas';

// ---------------------------------------------------------------------------
// The defaults constant
//
// Every key here mirrors one row in the design's defaults table.
// ---------------------------------------------------------------------------

export const RULE_DEFAULTS = {
  enabled: false as const,
  version: 1 as const,
  schedule: { interval: '5m' as const },
  language: 'kuery' as const,
  max_signals: 100 as const,
  setup: '' as const,
  tags: [] as string[],
  references: [] as string[],
  false_positives: [] as string[],
  author: [] as string[],
  threat: [] as never[],
  related_integrations: [] as never[],
  required_fields: [] as never[],
} as const;

// ---------------------------------------------------------------------------
// Apply defaults to a create request
//
// Spreads RULE_DEFAULTS under the caller's payload so caller-supplied values
// win.  Returns a new object that is guaranteed to have every defaultable field
// present — the caller no longer needs to branch on absence.
//
// Ref: rule-domain-model.md "The request shapes"
// ---------------------------------------------------------------------------

/**
 * Apply default values to a detection rule create request.
 *
 * Call this at the API layer (in the route handler or the
 * `DetectionRulesClient`) before converting the payload for the framework.
 * Do NOT call it on the stored builder fields — the builder schema forbids
 * defaults and transforms.
 *
 * Returns a new object with every defaultable field guaranteed to be present.
 * Caller-supplied values always win over the defaults.
 */
export function applyRuleDefaults(props: DetectionRuleCreateProps) {
  return {
    ...RULE_DEFAULTS,
    ...props,
    // schedule: merge so that a caller-supplied interval wins, but the default
    // applies when schedule is omitted entirely.
    schedule:
      props.schedule !== undefined
        ? { ...RULE_DEFAULTS.schedule, ...props.schedule }
        : RULE_DEFAULTS.schedule,
  };
}

/**
 * Apply default values to an update (PUT) request.
 *
 * PUT replaces the entire rule, so omitting a defaultable field resets it to
 * the same default as create.  `enabled` is not in the update schema, so it
 * is not re-applied here.
 */
export function applyRuleUpdateDefaults(props: DetectionRuleUpdateProps) {
  const { enabled: _ignored, ...nonEnabledDefaults } = RULE_DEFAULTS;
  return {
    ...nonEnabledDefaults,
    ...props,
    schedule:
      props.schedule !== undefined
        ? { ...RULE_DEFAULTS.schedule, ...props.schedule }
        : RULE_DEFAULTS.schedule,
  };
}
