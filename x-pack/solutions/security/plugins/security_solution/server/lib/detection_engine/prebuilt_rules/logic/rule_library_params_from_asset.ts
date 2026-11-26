/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COMMUNITY_LIBRARY_ID,
  ELASTIC_LIBRARY_ID,
  RULE_LIBRARY_DEFINITIONS,
} from '@kbn/security-rule-libraries';
import type { RuleLibraryParams } from '../../rule_schema';
import type { PrebuiltRuleAssetRecord } from '../model/rule_assets/prebuilt_rule_asset';

const LIBRARY_ICON_BY_ID: Record<string, string | undefined> = {
  [ELASTIC_LIBRARY_ID]: 'logoSecurity',
  [COMMUNITY_LIBRARY_ID]: 'users',
};

export const defaultElasticLibrary = (): RuleLibraryParams => {
  const definition = RULE_LIBRARY_DEFINITIONS.find(({ id }) => id === ELASTIC_LIBRARY_ID);
  return {
    id: ELASTIC_LIBRARY_ID,
    title: definition?.title ?? ELASTIC_LIBRARY_ID,
    icon: LIBRARY_ICON_BY_ID[ELASTIC_LIBRARY_ID],
  };
};

export const ruleLibraryParamsFromAsset = (
  rule: PrebuiltRuleAssetRecord
): RuleLibraryParams | undefined => {
  const libraryId = rule.library_id;
  if (!libraryId) {
    return undefined;
  }

  const definition = RULE_LIBRARY_DEFINITIONS.find(({ id }) => id === libraryId);

  return {
    id: libraryId,
    title: definition?.title ?? rule.library_title ?? libraryId,
    icon: LIBRARY_ICON_BY_ID[libraryId],
  };
};
