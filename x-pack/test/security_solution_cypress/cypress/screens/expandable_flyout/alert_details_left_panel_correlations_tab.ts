/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/left/tabs/test_ids';
import {
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_ANCESTRY_TABLE_TEST_ID,
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID,
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/left/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON = getDataTestSubjectSelector(
  INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID
);

export const CORRELATIONS_ANCESTRY_SECTION = getDataTestSubjectSelector(
  CORRELATIONS_DETAILS_BY_ANCESTRY_SECTION_TEST_ID
);

export const CORRELATIONS_SOURCE_SECTION = getDataTestSubjectSelector(
  CORRELATIONS_DETAILS_BY_SOURCE_SECTION_TEST_ID
);

export const CORRELATIONS_SESSION_SECTION = getDataTestSubjectSelector(
  CORRELATIONS_DETAILS_BY_SESSION_SECTION_TEST_ID
);

export const CORRELATIONS_CASES_SECTION = getDataTestSubjectSelector(
  CORRELATIONS_DETAILS_CASES_SECTION_TEST_ID
);

export const CORRELATIONS_ANCESTRY_TABLE = getDataTestSubjectSelector(
  CORRELATIONS_DETAILS_BY_ANCESTRY_TABLE_TEST_ID
);
