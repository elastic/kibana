/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCustomizationStatus } from '../../../../../common/api/detection_engine';
import type { GranularRulesFilter } from '../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { convertRulesFilterToKQL } from '../../../../../common/detection_engine/rule_management/rule_filtering';
import { prepareKQLStringParam } from '../../../../../common/utils/kql';

const INSTALLED_RULE_ID_FIELD = 'alert.attributes.params.ruleId';

export interface UpgradeReviewKqlFilterOptions {
  tags?: string[];
  customizationStatus?: RuleCustomizationStatus;
  ruleIds?: string[];
}

/**
 * Builds a KQL string targeting installed-rule alert SOs from the UI's structured filter.
 *
 * Free-text search is intentionally NOT folded in here — callers should pass it via
 * `search: { term, mode: 'legacy' }` so the server runs the richer multi-field match.
 */
export const buildUpgradeReviewKqlFilter = (
  options: UpgradeReviewKqlFilterOptions | undefined
): GranularRulesFilter | undefined => {
  if (!options) {
    return undefined;
  }

  const parts: string[] = [];

  const structuredKql = convertRulesFilterToKQL({
    tags: options.tags,
    customizationStatus: options.customizationStatus,
  });

  if (structuredKql.length > 0) {
    parts.push(structuredKql);
  }

  if (options.ruleIds?.length) {
    const ids = options.ruleIds.map(prepareKQLStringParam).join(' OR ');
    parts.push(`${INSTALLED_RULE_ID_FIELD}:(${ids})`);
  }

  if (parts.length === 0) {
    return undefined;
  }

  const term = parts.map((part) => `(${part})`).join(' AND ');
  return { term, mode: 'KQL' };
};
