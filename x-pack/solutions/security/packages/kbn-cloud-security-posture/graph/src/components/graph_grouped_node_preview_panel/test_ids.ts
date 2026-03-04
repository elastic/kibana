/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'GraphGroupedNodePreviewPanel' as const;

/* Used internally by EuiPagination - should not use `PREFIX` */
export const PAGINATION_BUTTON_NEXT_TEST_ID = 'pagination-button-next' as const;

export const LOADING_BODY_TEST_ID = `${PREFIX}LoadingBody` as const;
export const EMPTY_BODY_TEST_ID = `${PREFIX}EmptyBody` as const;
export const REFRESH_BUTTON_TEST_ID = `${PREFIX}RefreshButton` as const;
export const CONTENT_BODY_TEST_ID = `${PREFIX}ContentBody` as const;

export const PAGE_SIZE_BTN_TEST_ID = `${PREFIX}PageSizeBtn` as const;
export const TOTAL_HITS_TEST_ID = `${PREFIX}TotalHits` as const;
export const ICON_TEST_ID = `${PREFIX}DocumentIcon` as const;
export const GROUPED_ITEMS_TYPE_TEST_ID = `${PREFIX}GroupedItemsType` as const;

export const GROUPED_ITEM_TEST_ID = `${PREFIX}GroupedItem` as const;
export const GROUPED_ITEM_TITLE_TEST_ID_LINK = `${GROUPED_ITEM_TEST_ID}TitleLink` as const;
export const GROUPED_ITEM_TITLE_TEST_ID_TEXT = `${GROUPED_ITEM_TEST_ID}TitleText` as const;
export const GROUPED_ITEM_TITLE_TOOLTIP_TEST_ID = `${GROUPED_ITEM_TEST_ID}TitleTooltip` as const;
export const GROUPED_ITEM_TIMESTAMP_TEST_ID = `${GROUPED_ITEM_TEST_ID}Timestamp` as const;
export const GROUPED_ITEM_ACTOR_TEST_ID = `${GROUPED_ITEM_TEST_ID}Actor` as const;
export const GROUPED_ITEM_TARGET_TEST_ID = `${GROUPED_ITEM_TEST_ID}Target` as const;
export const GROUPED_ITEM_IP_TEST_ID = `${GROUPED_ITEM_TEST_ID}Ip` as const;
export const GROUPED_ITEM_GEO_TEST_ID = `${GROUPED_ITEM_TEST_ID}Geo` as const;
export const GROUPED_ITEM_RISK_TEST_ID = `${GROUPED_ITEM_TEST_ID}Risk` as const;
export const GROUPED_ITEM_SKELETON_TEST_ID = `${GROUPED_ITEM_TEST_ID}Skeleton` as const;
