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
import { allFacetFields } from '../facets/facet_fields';
import * as i18n from './translations';

/**
 * One readable label per filled condition, for chips and summaries. The facet field list gives
 * the fields and the value labels, so a set reads the same as the facets that built it.
 */
export const describeConditionParts = (
  conditions: RuleSetConditions,
  integrationTitles: Map<string, string> = new Map()
): string[] => {
  const normalized = normalizeRuleSetConditions(conditions);
  const labels = { integrationTitles };
  return [
    ...(normalized.search ? [`${i18n.SEARCH_CONDITION}: "${normalized.search.term}"`] : []),
    ...allFacetFields(undefined, normalized).flatMap((field) => {
      const { include, exclude } = field.get(normalized);
      const isTags = field.id === 'tags';
      const label = isTags ? i18n.TAGS : field.label;
      const list = (values: string[]) => values.map((value) => field.valueLabel(value, labels));
      const separator = isTags && normalized.tags?.match === 'all' ? ' + ' : ', ';
      return [
        ...(include.length ? [`${label}: ${list(include).join(separator)}`] : []),
        ...(exclude.length ? [`${i18n.NOT_CONDITION(label)}: ${list(exclude).join(', ')}`] : []),
      ];
    }),
  ];
};

interface Values<V> {
  include?: V[];
  exclude?: V[];
}

const union = <V>(a: V[] = [], b: V[] = []): V[] => [...new Set([...a, ...b])];

/** The table shows set AND filters: filter values narrow the included values, excludes add up. */
const mergeValues = <V>(set: Values<V> | undefined, filter: Values<V> | undefined) =>
  filter
    ? {
        ...set,
        ...filter,
        include: filter.include?.length ? filter.include : set?.include,
        exclude: union(set?.exclude, filter.exclude),
      }
    : set;

/**
 * Adds the visible table filters to set conditions. Included tags add up (a rule must have all of
 * them); for the other fields the filter values replace the included values of the set. Excluded
 * values of both stay.
 */
export const mergeConditions = (
  set: RuleSetConditions,
  filters: RuleSetConditions
): RuleSetConditions => {
  const categories = new Set([
    ...Object.keys(set.tag_categories ?? {}),
    ...Object.keys(filters.tag_categories ?? {}),
  ]);
  return normalizeRuleSetConditions({
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
    related_integrations: mergeValues(set.related_integrations, filters.related_integrations),
    mitre_tactic: mergeValues(set.mitre_tactic, filters.mitre_tactic),
    type: mergeValues(set.type, filters.type),
    severity: mergeValues(set.severity, filters.severity),
    tag_categories: Object.fromEntries(
      [...categories].map((category) => [
        category,
        mergeValues(set.tag_categories?.[category], filters.tag_categories?.[category]) ?? {},
      ])
    ),
  });
};
