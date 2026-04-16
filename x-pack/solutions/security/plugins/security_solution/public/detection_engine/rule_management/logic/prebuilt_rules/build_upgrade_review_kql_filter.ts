/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewPrebuiltRuleUpgradeFilter } from '../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_upgrade_filter';
import { RuleCustomizationStatus } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../../../../common/utils/kql';

const RULE_NAME_FIELD = 'alert.attributes.name';
const RULE_TAGS_FIELD = 'alert.attributes.tags';
const IS_CUSTOMIZED_FIELD = 'alert.attributes.params.ruleSource.isCustomized';

const buildNameClause = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return '';
  }
  const escapedTerm = fullyEscapeKQLStringParam(trimmed);
  const isSingleTerm = escapedTerm.split(' ').length === 1;
  if (isSingleTerm) {
    return `${RULE_NAME_FIELD}.keyword: *${escapedTerm}*`;
  }
  return `${RULE_NAME_FIELD}: ${prepareKQLStringParam(trimmed)}`;
};

const buildTagsClause = (tags: string[]): string => {
  const nonEmptyTags = tags.filter((tag) => tag.length > 0);
  if (nonEmptyTags.length === 0) {
    return '';
  }
  return `${RULE_TAGS_FIELD}:(${nonEmptyTags.map(prepareKQLStringParam).join(' AND ')})`;
};

const buildCustomizationStatusClause = (
  customizationStatus: RuleCustomizationStatus | undefined
): string => {
  if (customizationStatus === RuleCustomizationStatus.CUSTOMIZED) {
    return `${IS_CUSTOMIZED_FIELD}: true`;
  }
  if (customizationStatus === RuleCustomizationStatus.NOT_CUSTOMIZED) {
    return `NOT ${IS_CUSTOMIZED_FIELD}: true`;
  }
  return '';
};

/**
 * Converts the UI filter options into a KQL string targeting the alert SO
 * attribute namespace (`alert.attributes.*`). Preserves the prior UI
 * semantics:
 *   - `name`: substring match for single terms, exact phrase match for
 *     multi-term values
 *   - `tags`: AND across all provided tags
 *   - `customization_status`: maps to the `isCustomized` boolean flag
 *
 * Note: `rule_ids` is intentionally omitted — it is sent as a top-level
 * field on the request body, not encoded into KQL.
 */
export const buildUpgradeReviewKqlFilter = (
  filter: ReviewPrebuiltRuleUpgradeFilter | undefined
): string | undefined => {
  if (!filter) {
    return undefined;
  }

  const parts: string[] = [];

  if (filter.name) {
    const clause = buildNameClause(filter.name);
    if (clause) {
      parts.push(clause);
    }
  }

  if (filter.tags && filter.tags.length) {
    const clause = buildTagsClause(filter.tags);
    if (clause) {
      parts.push(clause);
    }
  }

  const customizationStatusClause = buildCustomizationStatusClause(filter.customization_status);
  if (customizationStatusClause) {
    parts.push(customizationStatusClause);
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.map((part) => `(${part})`).join(' AND ');
};
