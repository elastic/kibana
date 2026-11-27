/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_PARAMS_FIELDS } from '../../../../detection_engine/rule_management/rule_fields';
import type { GranularRulesFacetCategory } from './granular_rules_contract.gen';

export const RULES_FACET_CATEGORY_TO_ATTRIBUTE: Record<GranularRulesFacetCategory, string> = {
  tags: 'alert.attributes.tags',
  enabled: 'alert.attributes.enabled',
  updatedBy: 'alert.attributes.updatedBy',
  createdBy: 'alert.attributes.createdBy',
  lastRunOutcome: 'alert.attributes.lastRun.outcome',
  isCustomized: 'alert.attributes.params.ruleSource.isCustomized',
  type: 'alert.attributes.params.type',
  integration: 'alert.attributes.params.relatedIntegrations.package',
  tactic: RULE_PARAMS_FIELDS.TACTIC_NAME,
  technique: RULE_PARAMS_FIELDS.TECHNIQUE_ID,
  source: 'alert.attributes.params.immutable',
  severity: 'alert.attributes.params.severity',
};

/** A technique facet bucket may come from either of the two MITRE ID fields. */
export const getRulesFacetAttribute = (category: GranularRulesFacetCategory, value: string) =>
  category === 'technique' && /\.\d{3}$/.test(value)
    ? RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID
    : RULES_FACET_CATEGORY_TO_ATTRIBUTE[category];
