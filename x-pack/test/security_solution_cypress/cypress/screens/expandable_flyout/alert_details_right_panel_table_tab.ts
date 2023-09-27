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
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_FIELD = getDataTestSubjectSelector(
  'event-fields-browser-@timestamp-field'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_TIMESTAMP_VALUE =
  getDataTestSubjectSelector('event-field-@timestamp');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ID_ROW = getDataTestSubjectSelector(
  'event-fields-browser-_id-field'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_EVENT_TYPE_ROW = getDataTestSubjectSelector(
  'event-fields-browser-event-type-field'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_IN = getDataTestSubjectSelector(
  'actionItem-security-detailsFlyout-cellActions-filterIn'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_FILTER_OUT = getDataTestSubjectSelector(
  'actionItem-security-detailsFlyout-cellActions-filterOut'
);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_MORE_ACTIONS =
  getDataTestSubjectSelector('showExtraActionsButton');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_ADD_TO_TIMELINE =
  getDataTestSubjectSelector('actionItem-security-detailsFlyout-cellActions-addToTimeline');
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB_ROW_CELL_COPY_TO_CLIPBOARD =
  getDataTestSubjectSelector('actionItem-security-detailsFlyout-cellActions-copyToClipboard');
