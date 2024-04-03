/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_ENTITIES_BUTTON = getDataTestSubjectSelector(
  'securitySolutionFlyoutInsightsTabEntitiesButton'
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutUsersDetailsTitleText'
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS_RIGHT_SECTION =
  getDataTestSubjectSelector('securitySolutionFlyoutUsersDetailsRightSection');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_USER_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutUsersDetailsContent'
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_TITLE = getDataTestSubjectSelector(
  'securitySolutionFlyoutHostsDetailsTitleText'
);
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS_RIGHT_SECTION =
  getDataTestSubjectSelector('securitySolutionFlyoutHostsDetailsRightSection');
export const DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_HOST_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutHostsDetailsContent'
);
