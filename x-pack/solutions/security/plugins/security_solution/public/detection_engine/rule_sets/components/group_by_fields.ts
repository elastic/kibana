/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { GranularRulesFacetCategory } from '../../../../common/api/detection_engine/rule_management';
import type { RuleSetConditions } from '../../../../common/api/detection_engine/rule_sets';
import { useIntegrations } from '../../common/components/related_integrations/use_integrations';
import type { FilterOptions } from '../../rule_management/logic/types';
import { FACET_MISSING_VALUE } from '../../../../common/detection_engine/rule_management/rule_filtering';
import * as i18n from './translations';

export interface GroupByField {
  value: GranularRulesFacetCategory;
  text: string;
  /** A rule can have several values (tags, tactics), so it can be in several sections. */
  multiValue?: boolean;
}

export const GROUP_BY_FIELDS: GroupByField[] = [
  { value: 'integration', text: i18n.INTEGRATIONS, multiValue: true },
  { value: 'tags', text: i18n.TAGS, multiValue: true },
  { value: 'tactic', text: i18n.BROWSE_TACTIC, multiValue: true },
  { value: 'type', text: i18n.RULE_TYPES },
  { value: 'lastRunOutcome', text: i18n.BROWSE_LAST_RESPONSE },
  { value: 'enabled', text: i18n.GROUP_BY_ENABLED },
  { value: 'createdBy', text: i18n.BROWSE_CREATED_BY },
];

/** Elasticsearch returns boolean term keys as 1 and 0. */
export const normalizeFacetKey = (category: GranularRulesFacetCategory, key: string): string =>
  category === 'enabled' ? String(key === '1' || key === 'true') : key;

export const groupByValueLabel = (
  category: GranularRulesFacetCategory,
  value: string,
  integrationTitles?: Map<string, string>
): string => {
  if (value === FACET_MISSING_VALUE) {
    return i18n.GROUP_BY_NO_VALUE;
  }
  if (category === 'integration') {
    return integrationTitles?.get(value) ?? value;
  }
  if (category === 'type') {
    return i18n.RULE_TYPE_LABELS[value] ?? value;
  }
  if (category === 'enabled') {
    return value === 'true' ? i18n.GROUP_BY_ENABLED_TRUE : i18n.GROUP_BY_ENABLED_FALSE;
  }
  return value;
};

/** Group conditions for "New group from this section", when the field is a group condition. */
export const toGroupConditions = (
  category: GranularRulesFacetCategory,
  value: string
): RuleSetConditions | undefined => {
  switch (category) {
    case 'integration':
      return { integrations: [value] };
    case 'tags':
      return { tags: [value] };
    case 'type':
      return i18n.RULE_TYPE_LABELS[value] ? { rule_types: [value] } : undefined;
    default:
      return undefined;
  }
};

/** Integration package name → title, for readable section names ("endpoint" → "Elastic Defend"). */
export const useIntegrationTitles = (): Map<string, string> => {
  const { data } = useIntegrations();
  return useMemo(
    () =>
      new Map(
        (data ?? []).map((integration) => [integration.package_name, integration.package_title])
      ),
    [data]
  );
};

/**
 * The visible table filters that a rule set can store as conditions. Status filters (enabled,
 * last response, gaps) describe the state of a rule, not which rules belong together, so they are
 * not part of a group.
 */
export const filtersToGroupConditions = (filterOptions: FilterOptions): RuleSetConditions => {
  const conditions: RuleSetConditions = {};
  if (filterOptions.tags.length) conditions.tags = filterOptions.tags;
  if (filterOptions.includeRuleTypes?.length)
    conditions.rule_types = filterOptions.includeRuleTypes;
  if (filterOptions.showElasticRules !== filterOptions.showCustomRules) {
    conditions.source = filterOptions.showElasticRules ? 'elastic' : 'custom';
  }
  if (filterOptions.filter.trim()) conditions.search = filterOptions.filter.trim();
  if (filterOptions.browse) {
    Object.assign(
      conditions,
      toGroupConditions(filterOptions.browse.category, filterOptions.browse.value) ?? {}
    );
  }
  return conditions;
};
