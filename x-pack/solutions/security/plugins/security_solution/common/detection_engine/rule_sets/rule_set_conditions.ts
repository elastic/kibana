/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleSetConditions,
  RuleSetValues,
} from '../../api/detection_engine/rule_sets/rule_set.gen';

/** Tags combine like the tags filter of the rules table: a rule must have all of them. */
export const DEFAULT_TAGS_MATCH: NonNullable<RuleSetValues['match']> = 'all';
export const DEFAULT_INTEGRATIONS_MATCH: NonNullable<RuleSetValues['match']> = 'any';

interface IncludeExclude<T> {
  include?: T[];
  exclude?: T[];
}

const uniq = <T>(values?: T[]): T[] | undefined =>
  values?.length ? [...new Set(values)] : undefined;

const normalizeIncludeExclude = <T, F extends IncludeExclude<T>>(field?: F): F | undefined => {
  const include = uniq(field?.include);
  const exclude = uniq(field?.exclude);
  if (!include && !exclude) {
    return undefined;
  }
  const { include: _include, exclude: _exclude, ...rest } = field ?? {};
  return { ...rest, ...(include && { include }), ...(exclude && { exclude }) } as F;
};

const normalizeValues = (
  field: RuleSetValues | undefined,
  defaultMatch: NonNullable<RuleSetValues['match']>
): RuleSetValues | undefined => {
  const normalized = normalizeIncludeExclude<string, RuleSetValues>(field);
  return normalized && { ...normalized, match: normalized.match ?? defaultMatch };
};

/**
 * The stored form of conditions: no empty parts, no duplicate values, and `match` always written,
 * so a stored set keeps its meaning if a default changes later.
 */
export const normalizeRuleSetConditions = (conditions: RuleSetConditions): RuleSetConditions => {
  const normalized: RuleSetConditions = {
    tags: normalizeValues(conditions.tags, DEFAULT_TAGS_MATCH),
    related_integrations: normalizeValues(
      conditions.related_integrations,
      DEFAULT_INTEGRATIONS_MATCH
    ),
    type: normalizeIncludeExclude(conditions.type),
    severity: normalizeIncludeExclude(conditions.severity),
    rule_source: conditions.rule_source?.include.length ? conditions.rule_source : undefined,
    search: conditions.search?.term.trim()
      ? { term: conditions.search.term.trim(), mode: conditions.search.mode }
      : undefined,
  };
  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  ) as RuleSetConditions;
};

export const hasRuleSetConditions = (conditions: RuleSetConditions): boolean =>
  Object.keys(normalizeRuleSetConditions(conditions)).length > 0;

/** The included values of a field, for controls that only include. */
export const includedValues = <T>(field?: IncludeExclude<T>): T[] => field?.include ?? [];

/** Sets the included values of a field and keeps its excluded values and `match`. */
export const withIncludedValues = <T, F extends IncludeExclude<T>>(
  field: F | undefined,
  include: T[]
): F | undefined => normalizeIncludeExclude<T, F>({ ...field, include } as F);
