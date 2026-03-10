/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const DOCUMENT_DETAILS_FLYOUT_RESPONSE_TAB = getDataTestSubjectSelector(
  'securitySolutionFlyoutResponseTab'
);
export const DOCUMENT_DETAILS_FLYOUT_RESPONSE_DETAILS = getDataTestSubjectSelector(
  'securitySolutionFlyoutResponseDetails'
);
export const DOCUMENT_DETAILS_FLYOUT_RESPONSE_EMPTY = getDataTestSubjectSelector(
  'securitySolutionFlyoutResponseNoData'
);
