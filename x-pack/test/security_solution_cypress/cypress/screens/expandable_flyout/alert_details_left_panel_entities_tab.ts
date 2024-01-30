/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HOST_DETAILS_TEST_ID,
  USER_DETAILS_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/document_details/left/components/test_ids';
import { INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/document_details/left/tabs/test_ids';
import {
  EXPANDABLE_PANEL_CONTENT_TEST_ID,
  EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID,
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/shared/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON = getDataTestSubjectSelector(
  INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_TITLE = getDataTestSubjectSelector(
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(USER_DETAILS_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION =
  getDataTestSubjectSelector(EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(USER_DETAILS_TEST_ID));
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS = getDataTestSubjectSelector(
  EXPANDABLE_PANEL_CONTENT_TEST_ID(USER_DETAILS_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_TITLE = getDataTestSubjectSelector(
  EXPANDABLE_PANEL_HEADER_TITLE_TEXT_TEST_ID(HOST_DETAILS_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_RIGHT_SECTION =
  getDataTestSubjectSelector(EXPANDABLE_PANEL_HEADER_RIGHT_SECTION_TEST_ID(HOST_DETAILS_TEST_ID));
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS = getDataTestSubjectSelector(
  EXPANDABLE_PANEL_CONTENT_TEST_ID(HOST_DETAILS_TEST_ID)
);
