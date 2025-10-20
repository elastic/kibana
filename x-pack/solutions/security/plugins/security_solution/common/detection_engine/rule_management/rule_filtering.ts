/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleExecutionStatus } from '../../api/detection_engine';
import { RuleCustomizationStatus, RuleExecutionStatusEnum } from '../../api/detection_engine';
import { fullyEscapeKQLStringParam, prepareKQLStringParam } from '../../utils/kql';
import {
  ENABLED_FIELD,
  IS_CUSTOMIZED_FIELD,
  LAST_RUN_OUTCOME_FIELD,
  PARAMS_IMMUTABLE_FIELD,
  PARAMS_TYPE_FIELD,
  RULE_NAME_FIELD,
  RULE_PARAMS_FIELDS,
  TAGS_FIELD,
} from './rule_fields';

export const KQL_FILTER_IMMUTABLE_RULES = `${PARAMS_IMMUTABLE_FIELD}: true`;
export const KQL_FILTER_MUTABLE_RULES = `${PARAMS_IMMUTABLE_FIELD}: false`;
export const KQL_FILTER_ENABLED_RULES = `${ENABLED_FIELD}: true`;
export const KQL_FILTER_DISABLED_RULES = `${ENABLED_FIELD}: false`;
export const KQL_FILTER_CUSTOMIZED_RULES = `${IS_CUSTOMIZED_FIELD}: true`;
export const KQL_FILTER_NOT_CUSTOMIZED_RULES = `NOT ${IS_CUSTOMIZED_FIELD}: true`;

interface RulesFilterOptions {
  filter: string;
  showCustomRules: boolean;
  showElasticRules: boolean;
  enabled: boolean;
  tags: string[];
  excludeRuleTypes: Type[];
  ruleExecutionStatus: RuleExecutionStatus;
  customizationStatus: RuleCustomizationStatus;
  ruleIds: string[];
  includeRuleTypes?: Type[];
  allowExpensiveQueries?: boolean;
}

/**
 * Convert rules filter options object to KQL query
 *
 * @param filterOptions desired filters (e.g. filter/sortField/sortOrder)
 *
 * @returns KQL string
 */
export function convertRulesFilterToKQL({
  filter: searchTerm,
  showCustomRules,
  showElasticRules,
  enabled,
  tags,
  excludeRuleTypes = [],
  ruleExecutionStatus,
  customizationStatus,
  includeRuleTypes = [],
  allowExpensiveQueries = true,
}: Partial<RulesFilterOptions>): string {
  const kql: string[] = [];

  if (searchTerm?.length) {
    kql.push(`(${convertRuleSearchTermToKQL(searchTerm, allowExpensiveQueries)})`);
  }

  if (showCustomRules && showElasticRules) {
    // if both showCustomRules && showElasticRules selected we omit filter, as it includes all existing rules
  } else if (showElasticRules) {
    kql.push(KQL_FILTER_IMMUTABLE_RULES);
  } else if (showCustomRules) {
    kql.push(KQL_FILTER_MUTABLE_RULES);
  }

  if (enabled !== undefined) {
    kql.push(enabled ? KQL_FILTER_ENABLED_RULES : KQL_FILTER_DISABLED_RULES);
  }

  if (tags?.length) {
    kql.push(convertRuleTagsToKQL(tags));
  }

  if (excludeRuleTypes.length) {
    kql.push(`NOT ${convertRuleTypesToKQL(excludeRuleTypes)}`);
  }

  if (includeRuleTypes.length) {
    kql.push(convertRuleTypesToKQL(includeRuleTypes));
  }

  if (ruleExecutionStatus === RuleExecutionStatusEnum.succeeded) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "succeeded"`);
  } else if (ruleExecutionStatus === RuleExecutionStatusEnum['partial failure']) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "warning"`);
  } else if (ruleExecutionStatus === RuleExecutionStatusEnum.failed) {
    kql.push(`${LAST_RUN_OUTCOME_FIELD}: "failed"`);
  }

  if (customizationStatus === RuleCustomizationStatus.CUSTOMIZED) {
    kql.push(KQL_FILTER_CUSTOMIZED_RULES);
  } else if (customizationStatus === RuleCustomizationStatus.NOT_CUSTOMIZED) {
    kql.push(KQL_FILTER_NOT_CUSTOMIZED_RULES);
  }

  return kql.join(' AND ');
}

const SEARCHABLE_RULE_PARAMS = [
  RULE_NAME_FIELD,
  RULE_PARAMS_FIELDS.INDEX,
  RULE_PARAMS_FIELDS.TACTIC_ID,
  RULE_PARAMS_FIELDS.TACTIC_NAME,
  RULE_PARAMS_FIELDS.TECHNIQUE_ID,
  RULE_PARAMS_FIELDS.TECHNIQUE_NAME,
  RULE_PARAMS_FIELDS.SUBTECHNIQUE_ID,
  RULE_PARAMS_FIELDS.SUBTECHNIQUE_NAME,
];

/**
 * Build KQL search terms.
 *
 * Note that RULE_NAME_FIELD is special, for single term searches
 * we will also attempt to includes partial matches, if wildcards are allowed.
 *
 * Ie - "sql" =KQL=> *sql* --matches-->  sql, Postgreslq, SQLCMD.EXE
 *    - "sql:" =KQL=> *sql\:* --matches-->  sql:x64, but NOT sql_x64
 *
 * Whereas the rest of the fields, and multiple term searches,
 * we use exact term match with quotations.
 *
 * Ie - "sql" =KQL=> "sql" --matches--> sql server, but NOT mssql or SQLCMD.EXE
 *
 * @param searchTerm search term (ie from the search bar)
 * @param allowExpensiveQueries use slow queries with wildcards to improve results
 * @returns KQL String
 */
export function convertRuleSearchTermToKQL(
  searchTerm: string,
  allowExpensiveQueries = true
): string {
  const searchableConditions = SEARCHABLE_RULE_PARAMS.map(
    (param) => `${param}: ${prepareKQLStringParam(searchTerm)}`
  );
  if (allowExpensiveQueries) {
    const escapedTerm = fullyEscapeKQLStringParam(searchTerm);
    const isSingleTerm = escapedTerm.split(' ').length === 1;
    if (isSingleTerm) {
      const ruleNameCondition = `${RULE_NAME_FIELD}.keyword: *${escapedTerm}*`;
      return [ruleNameCondition].concat(searchableConditions).join(' OR ');
    }
  }
  return searchableConditions.join(' OR ');
}

export function convertRuleTagsToKQL(tags: string[]): string {
  return `${TAGS_FIELD}:(${tags.map(prepareKQLStringParam).join(' AND ')})`;
}

export function convertRuleTypesToKQL(ruleTypes: Type[]): string {
  return `${PARAMS_TYPE_FIELD}: (${ruleTypes.map(prepareKQLStringParam).join(' OR ')})`;
}
