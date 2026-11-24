/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_GROUPS_URL = '/internal/detection_engine/rule_groups' as const;
export const RULE_GROUP_URL = `${RULE_GROUPS_URL}/{id}` as const;
export const RULE_GROUP_RULE_IDS_URL = `${RULE_GROUPS_URL}/{id}/_rule_ids` as const;
export const RULE_GROUPS_PREVIEW_URL = `${RULE_GROUPS_URL}/_preview` as const;
export const RULE_GROUPS_MEMBERSHIP_URL = `${RULE_GROUPS_URL}/_membership` as const;
export const RULE_GROUPS_BULK_ASSIGN_URL = `${RULE_GROUPS_URL}/_bulk_assign` as const;
