/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDataTestSubjectSelector,
  getDataTestSubjectSelectorStartWith,
} from '../../helpers/common';

export const VIEW_CASE_TOASTER_LINK = getDataTestSubjectSelector('toaster-content-case-view-link');
export const VIEW_CASE_TOASTER_CLOSE_BUTTON = getDataTestSubjectSelector('toastCloseButton');
export const CREATE_CASE_BUTTON = `[data-test-subj="createNewCaseBtn"]`;
export const NEW_CASE_NAME_INPUT = `[data-test-subj="input"][aria-describedby="caseTitle"]`;
export const NEW_CASE_DESCRIPTION_INPUT = getDataTestSubjectSelector('euiMarkdownEditorTextArea');
export const EXISTING_CASE_SELECT_BUTTON =
  getDataTestSubjectSelectorStartWith('cases-table-row-select-');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_NAME_INPUT = NEW_CASE_NAME_INPUT;
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_DESCRIPTION_INPUT =
  NEW_CASE_DESCRIPTION_INPUT;
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE_CREATE_BUTTON =
  getDataTestSubjectSelector('create-case-submit');
