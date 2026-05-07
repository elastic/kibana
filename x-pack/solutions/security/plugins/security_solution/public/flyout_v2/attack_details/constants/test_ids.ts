/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

const ATTACK_DETAILS_TEST_ID = `${PREFIX}AttackDetails` as const;

export const ATTACK_DETAILS_FLYOUT_TEST_ID = ATTACK_DETAILS_TEST_ID;
export const FLYOUT_BODY_TEST_ID = `${ATTACK_DETAILS_TEST_ID}Body` as const;
export const FLYOUT_FOOTER_TEST_ID = `${ATTACK_DETAILS_TEST_ID}Footer` as const;
export const FLYOUT_FOOTER_TAKE_ACTION_BUTTON_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}FooterTakeActionButton` as const;

export const OVERVIEW_TAB_TEST_ID = `${ATTACK_DETAILS_TEST_ID}OverviewTab` as const;
export const TABLE_TAB_TEST_ID = `${ATTACK_DETAILS_TEST_ID}TableTab` as const;
export const JSON_TAB_TEST_ID = `${ATTACK_DETAILS_TEST_ID}JsonTab` as const;

export const HEADER_TITLE_TEST_ID = `${ATTACK_DETAILS_TEST_ID}HeaderTitle` as const;
export const HEADER_BADGE_TEST_ID = `${ATTACK_DETAILS_TEST_ID}HeaderBadge` as const;
export const HEADER_ALERTS_BLOCK_TEST_ID = `${ATTACK_DETAILS_TEST_ID}HeaderAlertsBlock` as const;
export const HEADER_STATUS_BLOCK_TEST_ID = `${ATTACK_DETAILS_TEST_ID}HeaderStatusBlock` as const;
export const HEADER_ASSIGNEES_BLOCK_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}HeaderAssigneesBlock` as const;
export const HEADER_ASSIGNEES_ADD_BUTTON_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}HeaderAssigneesAddButton` as const;

export const STATUS_POPOVER_BUTTON_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}StatusPopoverButton` as const;
export const STATUS_POPOVER_TEST_ID = `${ATTACK_DETAILS_TEST_ID}StatusPopover` as const;

export const INSIGHTS_SECTION_TEST_ID = `${ATTACK_DETAILS_TEST_ID}InsightsSection` as const;
export const INSIGHTS_ENTITIES_TEST_ID = `${ATTACK_DETAILS_TEST_ID}InsightsEntities` as const;
export const INSIGHTS_CORRELATIONS_TEST_ID =
  `${ATTACK_DETAILS_TEST_ID}InsightsCorrelations` as const;

const ATTACK_ENTITIES_TEST_ID = `${PREFIX}AttackEntities` as const;
export const ATTACK_ENTITIES_FLYOUT_TEST_ID = ATTACK_ENTITIES_TEST_ID;
export const ATTACK_ENTITIES_DETAILS_TEST_ID = `${ATTACK_ENTITIES_TEST_ID}Details` as const;
export const ATTACK_ENTITIES_DETAILS_LOADING_TEST_ID =
  `${ATTACK_ENTITIES_TEST_ID}DetailsLoading` as const;

const ATTACK_CORRELATIONS_TEST_ID = `${PREFIX}AttackCorrelations` as const;
export const ATTACK_CORRELATIONS_FLYOUT_TEST_ID = ATTACK_CORRELATIONS_TEST_ID;
export const ATTACK_CORRELATIONS_RELATED_ALERTS_TABLE_TEST_ID =
  `${ATTACK_CORRELATIONS_TEST_ID}RelatedAlertsTable` as const;
