/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects, ScoutTestConfig } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { EndpointManagementNavPage } from './endpoint_management_nav';
import { RolePrivilegeSummaryPage } from './role_privilege_summary';

export interface EdrRbacPageObjects extends SecurityPageObjects {
  endpointManagementNav: EndpointManagementNavPage;
  rolePrivilegeSummary: RolePrivilegeSummaryPage;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage,
  config: ScoutTestConfig
): EdrRbacPageObjects => ({
  ...pageObjects,
  endpointManagementNav: createLazyPageObject(
    EndpointManagementNavPage,
    page,
    config,
    pageObjects.serverlessProjectChromePage
  ),
  rolePrivilegeSummary: createLazyPageObject(RolePrivilegeSummaryPage, page),
});
