/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'GraphGroupedNodePreviewPanel' as const;

export const GROUPED_ITEM_TEST_ID = `${PREFIX}GroupedItem` as const;
export const GROUPED_ITEM_TITLE_TEST_ID = `${GROUPED_ITEM_TEST_ID}Title` as const;
export const GROUPED_ITEM_TIMESTAMP_TEST_ID = `${GROUPED_ITEM_TEST_ID}Timestamp` as const;
export const GROUPED_ITEM_ACTOR_TEST_ID = `${GROUPED_ITEM_TEST_ID}Actor` as const;
export const GROUPED_ITEM_TARGET_TEST_ID = `${GROUPED_ITEM_TEST_ID}Target` as const;
export const GROUPED_ITEM_IP_TEST_ID = `${GROUPED_ITEM_TEST_ID}Ip` as const;
export const GROUPED_ITEM_GEO_TEST_ID = `${GROUPED_ITEM_TEST_ID}Geo` as const;
export const GROUPED_ITEM_RISK_TEST_ID = `${GROUPED_ITEM_TEST_ID}Risk` as const;
export const GROUPED_ITEM_SKELETON_TEST_ID = `${GROUPED_ITEM_TEST_ID}Skeleton` as const;
