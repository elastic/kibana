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
/** Values of one MITRE tactic or one tag category are alternatives. */
export const DEFAULT_ANY_MATCH: NonNullable<RuleSetValues['match']> = 'any';

/** The tag prefix of a category, for example `OS` for `OS: Windows`; undefined without a prefix. */
export const tagCategoryOf = (tag: string): string | undefined => {
  const index = tag.indexOf(': ');
  return index > 0 ? tag.slice(0, index) : undefined;
};

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

const normalizeTagCategories = (
  categories: RuleSetConditions['tag_categories']
): RuleSetConditions['tag_categories'] => {
  const entries = Object.entries(categories ?? {}).flatMap(([category, values]) => {
    const normalized = normalizeValues(values, DEFAULT_ANY_MATCH);
    return normalized ? [[category, normalized] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
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
    mitre_tactic: normalizeValues(conditions.mitre_tactic, DEFAULT_ANY_MATCH),
    tag_categories: normalizeTagCategories(conditions.tag_categories),
    enabled: typeof conditions.enabled === 'boolean' ? conditions.enabled : undefined,
    last_run_outcome: normalizeIncludeExclude(conditions.last_run_outcome),
    search: conditions.search?.term.trim()
      ? { term: conditions.search.term.trim(), mode: conditions.search.mode }
      : undefined,
  };
  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  ) as RuleSetConditions;
};

/**
 * Moves prefixed tags from `tags` to `tag_categories` where the meaning stays the same: excluded
 * tags always; an included tag when it is the only included tag of its category and `tags`
 * requires all tags (or has one). Sets made by the AI or by an API client then open with the same
 * facets that would have built them.
 */
export const liftTagCategories = (conditions: RuleSetConditions): RuleSetConditions => {
  const { tags } = conditions;
  if (!tags) {
    return conditions;
  }
  const include = tags.include ?? [];
  const categories: Record<string, RuleSetValues> = { ...conditions.tag_categories };
  const kept: { include: string[]; exclude: string[] } = { include: [], exclude: [] };
  const lift = (tag: string, key: 'include' | 'exclude') => {
    const category = tagCategoryOf(tag);
    const current = category ? categories[category] : undefined;
    const canLift =
      category != null &&
      (key === 'exclude' ||
        (!current?.include?.length &&
          (tags.match === 'all' || include.length === 1) &&
          include.filter((other) => tagCategoryOf(other) === category).length === 1));
    if (category == null || !canLift) {
      kept[key].push(tag);
      return;
    }
    categories[category] = {
      ...current,
      [key]: [...(current?.[key] ?? []), tag],
      match: current?.match ?? DEFAULT_ANY_MATCH,
    };
  };
  include.forEach((tag) => lift(tag, 'include'));
  (tags.exclude ?? []).forEach((tag) => lift(tag, 'exclude'));
  return normalizeRuleSetConditions({
    ...conditions,
    tags: { ...tags, ...kept },
    tag_categories: categories,
  });
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
