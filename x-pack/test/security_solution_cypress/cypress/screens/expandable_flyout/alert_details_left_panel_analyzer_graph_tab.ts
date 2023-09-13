/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/left/tabs/test_ids';
import { ANALYZER_GRAPH_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/left/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON =
  getDataTestSubjectSelector(VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_CONTENT =
  getDataTestSubjectSelector(ANALYZER_GRAPH_TEST_ID);
