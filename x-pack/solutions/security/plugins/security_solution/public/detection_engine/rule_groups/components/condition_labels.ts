/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleGroupConditions } from '../../../../common/api/detection_engine/rule_groups';
import * as i18n from './translations';

/** One readable label per filled condition, for chips and summaries. */
export const describeConditionParts = (
  { tags, integrations, rule_types: ruleTypes, severities, source, search }: RuleGroupConditions,
  integrationTitles?: Map<string, string>
): string[] =>
  [
    search ? `${i18n.SEARCH_CONDITION}: "${search}"` : undefined,
    tags?.length ? `${i18n.TAGS}: ${tags.join(' + ')}` : undefined,
    integrations?.length
      ? `${i18n.INTEGRATIONS}: ${integrations
          .map((name) => integrationTitles?.get(name) ?? name)
          .join(', ')}`
      : undefined,
    ruleTypes?.length
      ? `${i18n.RULE_TYPES}: ${ruleTypes.map((t) => i18n.RULE_TYPE_LABELS[t] ?? t).join(', ')}`
      : undefined,
    severities?.length
      ? `${i18n.SEVERITY}: ${severities.map((s) => i18n.SEVERITY_LABELS[s] ?? s).join(', ')}`
      : undefined,
    source ? (source === 'elastic' ? i18n.SOURCE_ELASTIC : i18n.SOURCE_CUSTOM) : undefined,
  ].filter((part): part is string => part != null);

/**
 * Adds the visible table filters to group conditions. Tags add up (a rule must have all of them);
 * for the other fields the filter value replaces the group value.
 */
export const mergeConditions = (
  group: RuleGroupConditions,
  filters: RuleGroupConditions
): RuleGroupConditions => ({
  ...group,
  ...filters,
  ...(group.tags || filters.tags
    ? { tags: [...new Set([...(group.tags ?? []), ...(filters.tags ?? [])])] }
    : {}),
});
