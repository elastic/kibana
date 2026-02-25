/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import type { SecurityPageObjects } from '@kbn/scout-security';
import { EndpointListPage } from './endpoint_list_page';
import { PolicyPage } from './policy_page';
import {
  TrustedAppsPage,
  EventFiltersPage,
  BlocklistPage,
} from './artifacts_page';
import { ResponderPage } from './responder_page';
import { ResponseActionsPage } from './response_actions_page';

export interface DefendWorkflowsPageObjects extends SecurityPageObjects {
  endpointList: EndpointListPage;
  policy: PolicyPage;
  trustedApps: TrustedAppsPage;
  eventFilters: EventFiltersPage;
  blocklist: BlocklistPage;
  responder: ResponderPage;
  responseActions: ResponseActionsPage;
}

export const extendDWPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): DefendWorkflowsPageObjects => ({
  ...pageObjects,
  endpointList: new EndpointListPage(page),
  policy: new PolicyPage(page),
  trustedApps: new TrustedAppsPage(page),
  eventFilters: new EventFiltersPage(page),
  blocklist: new BlocklistPage(page),
  responder: new ResponderPage(page),
  responseActions: new ResponseActionsPage(page),
});
