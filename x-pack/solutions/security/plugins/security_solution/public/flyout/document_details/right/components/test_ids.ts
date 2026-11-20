/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREFIX } from '../../../shared/test_ids';

const FLYOUT_TABLE_TEST_ID = `${PREFIX}Table` as const;
export const FLYOUT_TABLE_FIELD_NAME_CELL_ICON_TEST_ID =
  `${FLYOUT_TABLE_TEST_ID}FieldNameCellIcon` as const;
export const FLYOUT_TABLE_FIELD_NAME_CELL_TEXT_TEST_ID =
  `${FLYOUT_TABLE_TEST_ID}FieldNameCellText` as const;
export const FLYOUT_TABLE_PIN_ACTION_TEST_ID = `${FLYOUT_TABLE_TEST_ID}PinAction` as const;
export const TABLE_TAB_SETTING_BUTTON_TEST_ID = `${PREFIX}TableTabSettingButton` as const;
export const TABLE_TAB_SETTING_HIGHLIGHTED_FIELDS_ONLY_TEST_ID =
  `${FLYOUT_TABLE_TEST_ID}HighlightedFieldsOnly` as const;
export const TABLE_TAB_SETTING_HIDE_EMPTY_FIELDS_TEST_ID =
  `${FLYOUT_TABLE_TEST_ID}HideEmptyFields` as const;
export const TABLE_TAB_SETTING_HIDE_ALERT_FIELDS_TEST_ID =
  `${FLYOUT_TABLE_TEST_ID}HideAlertFields` as const;
