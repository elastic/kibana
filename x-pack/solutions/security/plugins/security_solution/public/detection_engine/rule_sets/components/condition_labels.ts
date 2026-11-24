/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import {
  DEFAULT_TAGS_MATCH,
  normalizeRuleSetConditions,
} from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
import * as i18n from './translations';

interface IncludeExclude {
  include?: string[];
  exclude?: string[];
  match?: 'all' | 'any';
}

const describeField = (
  label: string,
  field: IncludeExclude | undefined,
  toLabel: (value: string) => string = (value) => value
): string[] => [
  ...(field?.include?.length
    ? [`${label}: ${field.include.map(toLabel).join(field.match === 'all' ? ' + ' : ', ')}`]
    : []),
  ...(field?.exclude?.length
    ? [`${i18n.NOT_CONDITION(label)}: ${field.exclude.map(toLabel).join(', ')}`]
    : []),
];

/** One readable label per filled condition, for chips and summaries. */
export const describeConditionParts = (
  conditions: RuleSetConditions,
  integrationTitles?: Map<string, string>
): string[] => {
  const {
    tags,
    related_integrations: integrations,
    type,
    severity,
    rule_source: ruleSource,
    search,
  } = normalizeRuleSetConditions(conditions);
  return [
    ...(search ? [`${i18n.SEARCH_CONDITION}: "${search.term}"`] : []),
    ...describeField(i18n.TAGS, tags),
    ...describeField(
      i18n.INTEGRATIONS,
      integrations,
      (name) => integrationTitles?.get(name) ?? name
    ),
    ...describeField(i18n.RULE_TYPES, type, (t) => i18n.RULE_TYPE_LABELS[t] ?? t),
    ...describeField(i18n.SEVERITY, severity, (s) => i18n.SEVERITY_LABELS[s] ?? s),
    ...(ruleSource
      ? [ruleSource.include[0] === 'external' ? i18n.SOURCE_ELASTIC : i18n.SOURCE_CUSTOM]
      : []),
  ];
};

const union = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])];

/**
 * Adds the visible table filters to set conditions. Included tags add up (a rule must have all of
 * them); for the other fields the filter values replace the included values of the set. Excluded
 * values of the set stay.
 */
export const mergeConditions = (
  set: RuleSetConditions,
  filters: RuleSetConditions
): RuleSetConditions =>
  normalizeRuleSetConditions({
    ...set,
    ...filters,
    tags:
      set.tags || filters.tags
        ? {
            include: union(set.tags?.include, filters.tags?.include),
            exclude: union(set.tags?.exclude, filters.tags?.exclude),
            match: set.tags?.match ?? DEFAULT_TAGS_MATCH,
          }
        : undefined,
    related_integrations: filters.related_integrations
      ? { ...set.related_integrations, ...filters.related_integrations }
      : set.related_integrations,
    type: filters.type ? { ...set.type, ...filters.type } : set.type,
    severity: filters.severity ? { ...set.severity, ...filters.severity } : set.severity,
  });
