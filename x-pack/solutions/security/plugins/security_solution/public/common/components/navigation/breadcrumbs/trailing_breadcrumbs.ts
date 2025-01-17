/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '../../../../../common';
import type { GetTrailingBreadcrumbs } from './types';

import { getTrailingBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../explore/hosts/pages/details/breadcrumbs';
import { getTrailingBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../explore/network/pages/details/breadcrumbs';
import { getTrailingBreadcrumbs as getDetectionRulesBreadcrumbs } from '../../../../detections/pages/detection_engine/rules/breadcrumbs';
import { getTrailingBreadcrumbs as geExceptionsBreadcrumbs } from '../../../../exceptions/utils/breadcrumbs';
import { getTrailingBreadcrumbs as getCSPBreadcrumbs } from '../../../../cloud_security_posture/breadcrumbs';
import { getTrailingBreadcrumbs as getUsersBreadcrumbs } from '../../../../explore/users/pages/details/breadcrumbs';
import { getTrailingBreadcrumbs as getDashboardBreadcrumbs } from '../../../../dashboards/pages/breadcrumbs';

export const getTrailingBreadcrumbs: GetTrailingBreadcrumbs = (
  spyState,
  getSecuritySolutionUrl
) => {
  switch (spyState.pageName) {
    case SecurityPageName.hosts:
      return getHostDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.network:
      return getIPDetailsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.users:
      return getUsersBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.rules:
    case SecurityPageName.rulesAdd:
    case SecurityPageName.rulesCreate:
      return getDetectionRulesBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.exceptions:
      return geExceptionsBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.cloudSecurityPostureBenchmarks:
      return getCSPBreadcrumbs(spyState, getSecuritySolutionUrl);
    case SecurityPageName.dashboards:
      return getDashboardBreadcrumbs(spyState, getSecuritySolutionUrl);
  }
  return [];
};
