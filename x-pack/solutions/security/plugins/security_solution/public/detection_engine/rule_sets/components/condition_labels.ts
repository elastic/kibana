/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { normalizeRuleSetConditions } from '../../../../common/detection_engine/rule_sets/rule_set_conditions';
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
