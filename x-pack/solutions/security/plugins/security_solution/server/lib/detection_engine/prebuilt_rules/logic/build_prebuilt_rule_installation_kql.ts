/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GranularRulesFilter,
  GranularRulesSearch,
} from '../../../../../common/api/detection_engine/rule_management/granular_rules/granular_rules_contract.gen';
import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../../../../common/utils/kql';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from './rule_assets/prebuilt_rule_assets_type';

export const convertPrebuiltRuleAssetSearchTermToKQL = (searchTerm: string): string => {
  const nameField = `${PREBUILT_RULE_ASSETS_SO_TYPE}.name`;
  const escapedTerm = fullyEscapeKQLStringParam(searchTerm);
  const isSingleTerm = escapedTerm.split(' ').length === 1;
  if (isSingleTerm) {
    return `${nameField}.keyword: *${escapedTerm}*`;
  }
  return `${nameField}: ${prepareKQLStringParam(searchTerm)}`;
};

/**
 * Combines KQL `filter` with `search`.
 */
export const buildPrebuiltRuleInstallationKql = ({
  filter,
  search,
}: {
  filter: GranularRulesFilter | undefined;
  search: GranularRulesSearch | undefined;
}): string | undefined => {
  const parts: string[] = [];
  const trimmedFilter = filter?.term?.trim();

  if (trimmedFilter) {
    parts.push(`(${trimmedFilter})`);
  }

  const searchMode = search?.mode ?? 'legacy';
  const trimmedSearch = search?.term?.trim();

  if (trimmedSearch && searchMode === 'legacy') {
    parts.push(`(${convertPrebuiltRuleAssetSearchTermToKQL(trimmedSearch)})`);
  }

  if (parts.length === 0) {
    return undefined;
  }
  if (parts.length === 1) {
    return parts[0];
  }

  return parts.join(' AND ');
};
