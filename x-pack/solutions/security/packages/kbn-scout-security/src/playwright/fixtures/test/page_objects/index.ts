/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { AlertsTablePage } from './alerts_table';
import { AlertDetailsRightPanelPage } from './alert_details_right_panel';
import { SecurityNavigation } from './security_navigation';
import { AssistantPage } from './assistant_page';
import { SecurityCommonPage } from './security_common';

export interface SecurityPageObjects extends PageObjects {
  alertsTablePage: AlertsTablePage;
  alertDetailsRightPanelPage: AlertDetailsRightPanelPage;
  securityNavigation: SecurityNavigation;
  assistantPage: AssistantPage;
  securityCommon: SecurityCommonPage;
}

export function extendPageObjects(pageObjects: PageObjects, page: ScoutPage): SecurityPageObjects {
  return {
    ...pageObjects,
    alertsTablePage: createLazyPageObject(AlertsTablePage, page),
    alertDetailsRightPanelPage: createLazyPageObject(AlertDetailsRightPanelPage, page),
    securityNavigation: createLazyPageObject(SecurityNavigation, page),
    assistantPage: createLazyPageObject(AssistantPage, page),
    securityCommon: createLazyPageObject(SecurityCommonPage, page),
  };
}
