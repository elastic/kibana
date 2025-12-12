/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const INDICATORS_TABLE_ADD_TO_NEW_CASE_BUTTON_ICON = getDataTestSubjectSelector(
  'tiIndicatorTableAddToNewCaseContextMenu'
);
export const INDICATORS_TABLE_ADD_TO_EXISTING_CASE_BUTTON_ICON = getDataTestSubjectSelector(
  'tiIndicatorTableAddToExistingCaseContextMenu'
);
export const FLYOUT_ADD_TO_EXISTING_CASE_ITEM = getDataTestSubjectSelector(
  'tiIndicatorFlyoutAddToExistingCaseContextMenu'
);
export const FLYOUT_ADD_TO_NEW_CASE_ITEM = getDataTestSubjectSelector(
  'tiIndicatorFlyoutAddToNewCaseContextMenu'
);
export const SELECT_EXISTING_CASE = `[class="eui-textTruncate"]`;
export const VIEW_CASE_TOASTER_LINK = getDataTestSubjectSelector('toaster-content-case-view-link');
export const CASE_COMMENT_EXTERNAL_REFERENCE = getDataTestSubjectSelector(
  'comment-externalReference-indicator'
);
export const NEW_CASE_NAME_INPUT = getDataTestSubjectSelector(
  'input"][aria-describedby="caseTitle'
);
export const NEW_CASE_DESCRIPTION_INPUT = getDataTestSubjectSelector('euiMarkdownEditorTextArea');
export const NEW_CASE_CREATE_BUTTON = getDataTestSubjectSelector('create-case-submit');
export const SELECT_CASE_TABLE_ROW = `.euiTableRow`;
export const SELECT_EXISTING_CASES_MODAL = getDataTestSubjectSelector('all-cases-modal');
