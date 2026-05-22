/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleResponseInternal } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';

/**
 * Special-case SO field mappings. Most RuleResponse fields translate directly
 * to their camelCase SO attribute name (e.g. `risk_score` → `riskScore`);
 * these entries handle the exceptions.
 *
 * - `id` lives on the SO root, not in attributes — no projection path needed.
 * - `execution_summary` is derived from three separate SO attributes.
 */
const SPECIAL_SO_FIELD_MAPPINGS: Record<string, readonly string[]> = {
  id: [],
  execution_summary: ['monitoring', 'lastRun', 'running'],
};

/**
 * Derive the complete set of valid field names by introspecting the
 * RuleResponse discriminated union schema. Each union variant is a ZodObject
 * whose `.shape` keys correspond to the public API field names. This keeps
 * VALID_SEARCH_FIELDS in sync with RuleResponse automatically.
 */
const deriveRuleResponseFieldNames = (): ReadonlySet<string> => {
  const keys = new Set<string>();
  const union = RuleResponseInternal as unknown as {
    options: ReadonlyArray<{ shape: Record<string, unknown> }>;
  };
  for (const option of union.options) {
    for (const key of Object.keys(option.shape)) {
      keys.add(key);
    }
  }
  return keys;
};

export const VALID_SEARCH_FIELDS: ReadonlySet<string> = deriveRuleResponseFieldNames();

/**
 * SO attributes the rule transformation pipeline (`normalizeCommonRuleFields`, etc.)
 * always reads, regardless of what the caller asked for. Without these, `fields:`
 * projection silently strips data the transformer expects to be present.
 */
export const REQUIRED_TRANSFORM_SO_FIELDS: readonly string[] = [
  'schedule',
  'params',
  'updatedAt',
  'createdAt',
];

const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Translate a list of public `RuleResponse` field names to the SO attribute names the
 * alerting find projection expects, and union with the always-required transform fields.
 * Returns `undefined` for an empty input so callers can pass the result straight through
 * to `findRules({ fields })` (which treats undefined as "all fields").
 */
export const translateSearchFieldsToSoFields = (
  fields: readonly string[] | undefined
): string[] | undefined => {
  if (fields == null || fields.length === 0) {
    return undefined;
  }
  const expanded = fields.flatMap((f) =>
    f in SPECIAL_SO_FIELD_MAPPINGS ? SPECIAL_SO_FIELD_MAPPINGS[f] : [snakeToCamel(f)]
  );
  return Array.from(new Set([...expanded, ...REQUIRED_TRANSFORM_SO_FIELDS]));
};
