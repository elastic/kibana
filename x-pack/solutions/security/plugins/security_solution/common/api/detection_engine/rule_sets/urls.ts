/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_SETS_URL = '/internal/detection_engine/rule_sets' as const;
export const RULE_SET_URL = `${RULE_SETS_URL}/{id}` as const;
export const RULE_SET_RULE_IDS_URL = `${RULE_SETS_URL}/{id}/_rule_ids` as const;
export const RULE_SETS_PREVIEW_URL = `${RULE_SETS_URL}/_preview` as const;
export const RULE_SETS_MEMBERSHIP_URL = `${RULE_SETS_URL}/_membership` as const;
export const RULE_SETS_BULK_ASSIGN_URL = `${RULE_SETS_URL}/_bulk_assign` as const;
