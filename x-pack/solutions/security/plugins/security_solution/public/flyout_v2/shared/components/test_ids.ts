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
export const RISK_SCORE_TITLE_TEST_ID = `${PREFIX}HeaderRiskScoreTitle` as const;
export const RISK_SCORE_VALUE_TEST_ID = `${PREFIX}HeaderRiskScoreValue` as const;
export const ASSIGNEES_TITLE_TEST_ID = `${PREFIX}HeaderAssigneesTitle` as const;
