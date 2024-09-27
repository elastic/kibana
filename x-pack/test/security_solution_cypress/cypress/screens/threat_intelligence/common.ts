/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../../helpers/common';

export const UPDATE_STATUS = getDataTestSubjectSelector('updateStatus');
export const SECURITY_SOLUTION_NAVBAR_MANAGE_ITEM = getDataTestSubjectSelector(
  'solutionSideNavItemLink-administration'
);
export const SECURITY_SOLUTION_NAVBAR_THREAT_INTELLIGENCE_ITEM = getDataTestSubjectSelector(
  'solutionSideNavItemLink-threat_intelligence'
);
export const MANAGE_NAVIGATION_ITEMS = `.euiLink`;
