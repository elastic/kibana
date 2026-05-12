/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../flyout/shared/test_ids';

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

export const TITLE_HEADER_ICON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Icon`;
export const TITLE_HEADER_TEXT_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}Text`;
export const TITLE_LINK_ICON_TEST_ID = (dataTestSubj: string) => `${dataTestSubj}LinkIcon`;

export const ALERT_SUMMARY_PANEL_TEST_ID = `${PREFIX}HeaderAlertSummaryPanel` as const;

export const TIMESTAMP_TEST_ID = `${PREFIX}HeaderTimestamp` as const;

export const NOTES_TITLE_TEST_ID = `${PREFIX}HeaderNotesTitle` as const;
export const NOTES_ADD_NOTE_BUTTON_TEST_ID = `${PREFIX}HeaderNotesAddNoteButton` as const;
export const NOTES_VIEW_NOTES_BUTTON_TEST_ID = `${PREFIX}HeaderNotesViewNotesButton` as const;
export const NOTES_ADD_NOTE_ICON_BUTTON_TEST_ID = `${PREFIX}HeaderNotesAddNoteIconButton` as const;
export const NOTES_COUNT_TEST_ID = `${PREFIX}HeaderNotesCount` as const;
export const NOTES_LOADING_TEST_ID = `${PREFIX}HeaderNotesLoading` as const;

export const TOOLS_FLYOUT_HEADER_TEST_ID = `${PREFIX}ToolsFlyoutHeader` as const;
export const TOOLS_FLYOUT_HEADER_TITLE_TEST_ID = `${PREFIX}ToolsFlyoutHeaderTitle` as const;

export const CHILD_LINK_TEST_ID = `${PREFIX}ChildLink` as const;

export const FLYOUT_LOADING_TEST_ID = `${PREFIX}Loading` as const;
export const FLYOUT_ERROR_TEST_ID = `${PREFIX}Error` as const;

/* Table tab */

export const TABLE_TAB_TEST_ID = `${PREFIX}TableTab` as const;

const TABLE_TAB_SETTING_TEST_ID = `${PREFIX}TableTabSetting` as const;
export const TABLE_TAB_SETTING_BUTTON_TEST_ID = `${TABLE_TAB_SETTING_TEST_ID}Button` as const;
export const TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID =
  `${TABLE_TAB_SETTING_TEST_ID}HighlightedFieldsOnly` as const;
export const TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID =
  `${TABLE_TAB_SETTING_TEST_ID}HideEmptyFields` as const;
export const TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID =
  `${TABLE_TAB_SETTING_TEST_ID}HideAlertFields` as const;
