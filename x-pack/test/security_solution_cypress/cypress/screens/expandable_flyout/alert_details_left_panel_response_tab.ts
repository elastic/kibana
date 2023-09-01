/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_TAB_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/left/test_ids';
import { RESPONSE_EMPTY_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/left/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_RESPONSE_TAB =
  getDataTestSubjectSelector(RESPONSE_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_RESPONSE_EMPTY =
  getDataTestSubjectSelector(RESPONSE_EMPTY_TEST_ID);
