/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const RULE_TYPE_PREFIX = `assetInventorySiem` as const;
export const EQL_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.eqlRule` as const;
export const ESQL_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.esqlRule` as const;
export const INDICATOR_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.indicatorRule` as const;
export const ML_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.mlRule` as const;
export const QUERY_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.queryRule` as const;
export const SAVED_QUERY_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.savedQueryRule` as const;
export const THRESHOLD_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.thresholdRule` as const;
export const NEW_TERMS_RULE_TYPE_ID = `${RULE_TYPE_PREFIX}.newTermsRule` as const;

export const ASSET_INVENTORY_RULE_TYPE_IDS = [
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
];
