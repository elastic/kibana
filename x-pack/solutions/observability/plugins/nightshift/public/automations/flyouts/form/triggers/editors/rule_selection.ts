/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CatalogRule } from '../../../../../hooks/use_rule_catalog';
import { rulePickerLabels, triggerLabels } from '../translations';

export interface RuleSelection {
  ruleNames: string[];
  ruleTags: string[];
}

export const matchedTags = (rule: CatalogRule, { ruleTags }: RuleSelection) =>
  rule.tags.filter((tag) => ruleTags.includes(tag));

export const resolveRuleNames = (catalog: CatalogRule[], selection: RuleSelection) => [
  ...new Set([
    ...selection.ruleNames,
    ...catalog.filter((rule) => matchedTags(rule, selection).length > 0).map(({ name }) => name),
  ]),
];

export const rulePillLabel = (catalog: CatalogRule[], selection: RuleSelection) => {
  const { ruleNames, ruleTags } = selection;
  if (ruleNames.length === 0 && ruleTags.length === 0) return triggerLabels.anyRule;
  if (ruleTags.length === 0 && ruleNames.length === 1) return ruleNames[0];
  if (ruleNames.length === 0 && ruleTags.length === 1) {
    return rulePickerLabels.taggedPill(ruleTags[0]);
  }
  return rulePickerLabels.ruleCount(resolveRuleNames(catalog, selection).length);
};
