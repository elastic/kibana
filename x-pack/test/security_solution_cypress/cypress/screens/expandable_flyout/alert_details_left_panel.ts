/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INSIGHTS_TAB_BUTTON_GROUP_TEST_ID,
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/left/tabs/test_ids';
import {
  INSIGHTS_TAB_TEST_ID,
  VISUALIZE_TAB_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/left/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB =
  getDataTestSubjectSelector(INSIGHTS_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB =
  getDataTestSubjectSelector(VISUALIZE_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_BUTTON_GROUP = getDataTestSubjectSelector(
  VISUALIZE_TAB_BUTTON_GROUP_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_BUTTON_GROUP = getDataTestSubjectSelector(
  INSIGHTS_TAB_BUTTON_GROUP_TEST_ID
);
