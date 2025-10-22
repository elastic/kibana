/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsTabPrevalenceButton'
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_DATE_PICKER =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsDatePicker');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_TYPE_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableFieldCell');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_NAME_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableValueCell');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_ALERT_COUNT_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableAlertCountCell');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_DOC_COUNT_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableDocCountCell');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_HOST_PREVALENCE_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableHostPrevalenceCell');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_USER_PREVALENCE_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTableUserPrevalenceCell');

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_TABLE_LINK_CELL =
  getDataTestSubjectSelector('securitySolutionFlyoutPrevalenceDetailsTablePreviewLinkCell');
