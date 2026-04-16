/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fullyEscapeKQLStringParam,
  prepareKQLStringParam,
} from '../../../../../../common/utils/kql';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../rule_assets/prebuilt_rule_assets_type';

const NAME_FIELD = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.name`;
const TAGS_FIELD = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.tags`;
const TYPE_FIELD = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.type`;

const SEARCHABLE_ASSET_ATTRIBUTES = [TAGS_FIELD, TYPE_FIELD];

/**
 * Converts a legacy free-text search term into a KQL expression scoped to the
 * prebuilt rule asset SO (`security-rule.attributes.*`).
 *
 * For single-term values a case-insensitive substring match is performed
 * against the rule name. For multi-term values an exact phrase match is used
 * against the analyzed name field. In both cases the term is additionally
 * matched against tags and type for broader discoverability.
 */
export const convertPrebuiltRuleAssetSearchTermToKql = (searchTerm: string): string => {
  const searchableConditions = SEARCHABLE_ASSET_ATTRIBUTES.map(
    (attribute) => `${attribute}: ${prepareKQLStringParam(searchTerm)}`
  );
  const escapedTerm = fullyEscapeKQLStringParam(searchTerm);
  const isSingleTerm = escapedTerm.split(' ').length === 1;
  const nameCondition = isSingleTerm
    ? `${NAME_FIELD}.keyword: *${escapedTerm}*`
    : `${NAME_FIELD}: ${prepareKQLStringParam(searchTerm)}`;

  return [nameCondition].concat(searchableConditions).join(' OR ');
};
