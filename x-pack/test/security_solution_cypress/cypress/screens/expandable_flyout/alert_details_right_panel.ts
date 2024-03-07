/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FLYOUT_BODY_TEST_ID,
  JSON_TAB_TEST_ID,
  OVERVIEW_TAB_TEST_ID,
  TABLE_TAB_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/document_details/right/test_ids';
import {
  RISK_SCORE_TITLE_TEST_ID,
  RISK_SCORE_VALUE_TEST_ID,
  SEVERITY_VALUE_TEST_ID,
  STATUS_BUTTON_TEST_ID,
  FLYOUT_ALERT_HEADER_TITLE_TEST_ID,
  ASSIGNEES_HEADER_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/document_details/right/components/test_ids';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  TITLE_HEADER_TEXT_TEST_ID,
  TITLE_LINK_ICON_TEST_ID,
} from '@kbn/security-solution-plugin/public/flyout/shared/components/test_ids';
import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_BODY = getDataTestSubjectSelector(FLYOUT_BODY_TEST_ID);

/* Header */

export const DOCUMENT_DETAILS_FLYOUT_HEADER_ICON = getDataTestSubjectSelector(
  TITLE_LINK_ICON_TEST_ID(FLYOUT_ALERT_HEADER_TITLE_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_TITLE = getDataTestSubjectSelector(
  TITLE_HEADER_TEXT_TEST_ID(FLYOUT_ALERT_HEADER_TITLE_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_LINK_ICON = getDataTestSubjectSelector(
  TITLE_LINK_ICON_TEST_ID(FLYOUT_ALERT_HEADER_TITLE_TEST_ID)
);
export const DOCUMENT_DETAILS_FLYOUT_CLOSE_BUTTON =
  getDataTestSubjectSelector('euiFlyoutCloseButton');
export const DOCUMENT_DETAILS_FLYOUT_EXPAND_DETAILS_BUTTON = getDataTestSubjectSelector(
  EXPAND_DETAILS_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_COLLAPSE_DETAILS_BUTTON = getDataTestSubjectSelector(
  COLLAPSE_DETAILS_BUTTON_TEST_ID
);
export const DOCUMENT_DETAILS_FLYOUT_OVERVIEW_TAB =
  getDataTestSubjectSelector(OVERVIEW_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_TABLE_TAB = getDataTestSubjectSelector(TABLE_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_JSON_TAB = getDataTestSubjectSelector(JSON_TAB_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_STATUS =
  getDataTestSubjectSelector(STATUS_BUTTON_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE =
  getDataTestSubjectSelector(RISK_SCORE_TITLE_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_RISK_SCORE_VALUE =
  getDataTestSubjectSelector(RISK_SCORE_VALUE_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_SEVERITY_VALUE =
  getDataTestSubjectSelector(SEVERITY_VALUE_TEST_ID);
export const DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES =
  getDataTestSubjectSelector(ASSIGNEES_HEADER_TEST_ID);

/* Footer */

export const DOCUMENT_DETAILS_FLYOUT_FOOTER = getDataTestSubjectSelector(
  'side-panel-flyout-footer'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON = getDataTestSubjectSelector(
  'take-action-dropdown-btn'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_TAKE_ACTION_BUTTON_DROPDOWN =
  getDataTestSubjectSelector('takeActionPanelMenu');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_NEW_CASE =
  getDataTestSubjectSelector('add-to-new-case-action');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_TO_EXISTING_CASE = getDataTestSubjectSelector(
  'add-to-existing-case-action'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_MARK_AS_ACKNOWLEDGED = getDataTestSubjectSelector(
  'acknowledged-alert-status'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_MARK_AS_CLOSED =
  getDataTestSubjectSelector('close-alert-status');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_ENDPOINT_EXCEPTION = getDataTestSubjectSelector(
  'add-endpoint-exception-menu-item'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION =
  getDataTestSubjectSelector('add-exception-menu-item');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_HEADER =
  getDataTestSubjectSelector('exceptionFlyoutTitle');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ADD_RULE_EXCEPTION_FLYOUT_CANCEL_BUTTON =
  getDataTestSubjectSelector('cancelExceptionAddButton');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_ISOLATE_HOST = getDataTestSubjectSelector(
  'isolate-host-action-item'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_RESPOND = getDataTestSubjectSelector(
  'endpointResponseActions-action-item'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE = getDataTestSubjectSelector(
  'investigate-in-timeline-action-item'
);
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_SECTION =
  getDataTestSubjectSelector('timelineHeader');
export const DOCUMENT_DETAILS_FLYOUT_FOOTER_INVESTIGATE_IN_TIMELINE_ENTRY =
  getDataTestSubjectSelector('providerContainer');
