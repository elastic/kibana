/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Public API (version 2023-10-31). */
export const RULE_SETS_URL = '/api/detection_engine/rule_sets' as const;
export const RULE_SET_URL = `${RULE_SETS_URL}/{id}` as const;
export const RULE_SETS_API_VERSION = '2023-10-31' as const;

/** Internal API of the rules page (version 1). */
const RULE_SETS_INTERNAL_URL = '/internal/detection_engine/rule_sets' as const;
export const RULE_SETS_PREVIEW_URL = `${RULE_SETS_INTERNAL_URL}/_preview` as const;
export const RULE_SETS_MEMBERSHIP_URL = `${RULE_SETS_INTERNAL_URL}/_membership` as const;
export const RULE_SETS_BULK_ASSIGN_URL = `${RULE_SETS_INTERNAL_URL}/_bulk_assign` as const;
export const RULE_SETS_GAPS_SUMMARY_URL = `${RULE_SETS_INTERNAL_URL}/_gaps_summary` as const;
export const RULE_SETS_PRIVATE_URL = `${RULE_SETS_INTERNAL_URL}/_private` as const;
export const RULE_SET_PRIVATE_URL = `${RULE_SETS_PRIVATE_URL}/{id}` as const;
export const RULE_SETS_INTERNAL_API_VERSION = '1' as const;
