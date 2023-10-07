/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TABLE_TAB_CONTENT_TEST_ID } from '@kbn/security-solution-plugin/public/flyout/right/tabs/test_ids';
import { getClassSelector, getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CONTENT =
  getDataTestSubjectSelector(TABLE_TAB_CONTENT_TEST_ID);

export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_FILTER = getClassSelector('euiFieldSearch');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_CLEAR_FILTER =
  getDataTestSubjectSelector('clearSearchButton');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_ROW = getDataTestSubjectSelector(
  'event-fields-table-row-@timestamp'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_CELL =
  getDataTestSubjectSelector('event-field-@timestamp');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW = getDataTestSubjectSelector(
  'event-fields-table-row-_id'
);
const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS =
  'actionItem-security-detailsFlyout-cellActions-';
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN = getDataTestSubjectSelector(
  `${DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS}filterIn`
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT = getDataTestSubjectSelector(
  `${DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS}filterOut`
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_TOGGLE_COLUMN = getDataTestSubjectSelector(
  `${DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS}toggleColumn`
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE =
  getDataTestSubjectSelector(`${DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS}addToTimeline`);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD =
  getDataTestSubjectSelector(
    `${DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ACTIONS}copyToClipboard`
  );
