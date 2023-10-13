/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JSON_TAB_CONTENT_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/document_details/right/tabs/test_ids';
import { RIGHT_SECTION_TEST_ID } from '@kbn/expandable-flyout/src/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_RIGHT_PANEL_CONTENT =
  getDataTestSubjectSelector(RIGHT_SECTION_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_JSON_TAB_CONTENT =
  getDataTestSubjectSelector(JSON_TAB_CONTENT_TEST_ID);
