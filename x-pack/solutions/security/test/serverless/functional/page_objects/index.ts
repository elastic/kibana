/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as svlPlatformPageObjects } from '@kbn/test-suites-xpack-platform/serverless/functional/page_objects';
import { SvlSecLandingPageProvider } from './svl_sec_landing_page';
import { CspSecurityCommonProvider } from './security_common';
import { CspDashboardPageProvider } from '../../../cloud_security_posture_functional/page_objects/csp_dashboard_page';
import { AddCisIntegrationFormPageProvider } from '../../../cloud_security_posture_functional/page_objects/add_cis_integration_form_page';

export const pageObjects = {
  ...svlPlatformPageObjects,
  // Security Solution serverless FTR page objects
  svlSecLandingPage: SvlSecLandingPageProvider,
  cloudPostureDashboard: CspDashboardPageProvider,
  cisAddIntegration: AddCisIntegrationFormPageProvider,
  cspSecurity: CspSecurityCommonProvider,
};
