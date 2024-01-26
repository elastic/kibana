/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pageObjects as xpackFunctionalPageObjects } from '../../functional/page_objects';
import { FindingsPageProvider } from './findings_page';
import { CspDashboardPageProvider } from './csp_dashboard_page';
import { AddCisIntegrationFormPageProvider } from './add_cis_integration_form_page';
import { VulnerabilityDashboardPageProvider } from './vulnerability_dashboard_page_object';
import { RulePagePageProvider } from './rule_page';

export const cloudSecurityPosturePageObjects = {
  findings: FindingsPageProvider,
  cloudPostureDashboard: CspDashboardPageProvider,
  cisAddIntegration: AddCisIntegrationFormPageProvider,
  vulnerabilityDashboard: VulnerabilityDashboardPageProvider,
  rule: RulePagePageProvider,
};
export const pageObjects = {
  ...xpackFunctionalPageObjects,
  ...cloudSecurityPosturePageObjects,
};
