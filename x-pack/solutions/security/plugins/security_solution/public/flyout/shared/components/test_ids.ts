/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../test_ids';

export const FLYOUT_PREVIEW_LINK_TEST_ID = `${PREFIX}PreviewLink` as const;

export const FLYOUT_ERROR_TEST_ID = `${PREFIX}Error` as const;
export const FLYOUT_LOADING_TEST_ID = `${PREFIX}Loading` as const;
export const EXPANDABLE_PANEL_TOGGLE_ICON_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}ToggleIcon`;
export const EXPANDABLE_PANEL_HEADER_LEFT_SECTION_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}LeftSection`;
export const EXPANDABLE_PANEL_HEADER_TITLE_ICON_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}TitleIcon`;
export const EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}TitleLink`;
export const EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}TitleText`;
export const EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID = (dataTestSubj: string) =>
  `${dataTestSubj}RightSection`;
export const EXPANDABLE_PANEL_LOADING_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Loading`;
export const EXPANDABLE_PANEL_CONTENT_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Content`;

/* Header Navigation */

const FLYOUT_NAVIGATION_TEST_ID = `${PREFIX}Navigation` as const;
export const EXPAND_DETAILS_BUTTON_TEST_ID =
  `${FLYOUT_NAVIGATION_TEST_ID}ExpandDetailButton` as const;
export const COLLAPSE_DETAILS_BUTTON_TEST_ID =
  `${FLYOUT_NAVIGATION_TEST_ID}CollapseDetailButton` as const;
export const HEADER_ACTIONS_TEST_ID = `${FLYOUT_NAVIGATION_TEST_ID}Actions` as const;

export const TITLE_HEADER_ICON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Icon`;
export const TITLE_HEADER_TEXT_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Text`;
export const TITLE_LINK_ICON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}LinkIcon`;

/* History */
export const FLYOUT_HISTORY_TEST_ID = `${PREFIX}History` as const;
export const FLYOUT_HISTORY_BUTTON_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}Button` as const;
export const FLYOUT_HISTORY_CONTEXT_PANEL_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}ContextPanel` as const;

export const DOCUMENT_DETAILS_HISTORY_ROW_TEST_ID =
  `${FLYOUT_HISTORY_TEST_ID}DocumentDetailsRow` as const;
export const RULE_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}RuleRow` as const;
export const HOST_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}HostRow` as const;
export const USER_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}UserRow` as const;
export const NETWORK_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}NetworkRow` as const;
export const GENERIC_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}GenericRow` as const;
export const NO_DATA_HISTORY_ROW_TEST_ID = `${FLYOUT_HISTORY_TEST_ID}NoDataRow` as const;
