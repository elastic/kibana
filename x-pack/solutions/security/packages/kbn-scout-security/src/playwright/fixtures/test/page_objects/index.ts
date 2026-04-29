/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PageObjects, ScoutPage, ScoutTestConfig } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { AlertsTablePage } from './alerts_table';
import { AlertDetailsRightPanelPage } from './alert_details_right_panel';
import { EntityAnalyticsDashboardsPage } from './entity_analytics_dashboards';
import { EntityAnalyticsManagementPage } from './entity_analytics_management';
import { CspmIntegrationPage } from './cspm_integration_page';
import { TimelinePage } from './timeline';
import { DetectionsAttackDiscoveryPage } from './detections_attack_discovery';
import { AttackDetailsRightPanelPage } from './attack_details_right_panel';

export interface SecurityPageObjects extends PageObjects {
  alertsTablePage: AlertsTablePage;
  alertDetailsRightPanelPage: AlertDetailsRightPanelPage;
  entityAnalyticsDashboardsPage: EntityAnalyticsDashboardsPage;
  entityAnalyticsManagementPage: EntityAnalyticsManagementPage;
  cspmIntegrationPage: CspmIntegrationPage;
  timelinePage: TimelinePage;
  detectionsAttackDiscoveryPage: DetectionsAttackDiscoveryPage;
  attackDetailsRightPanelPage: AttackDetailsRightPanelPage;
}

export function extendPageObjects(
  pageObjects: PageObjects,
  page: ScoutPage,
  config: ScoutTestConfig
): SecurityPageObjects {
  return {
    ...pageObjects,
    alertsTablePage: createLazyPageObject(AlertsTablePage, page),
    alertDetailsRightPanelPage: createLazyPageObject(AlertDetailsRightPanelPage, page),
    entityAnalyticsDashboardsPage: createLazyPageObject(EntityAnalyticsDashboardsPage, page),
    entityAnalyticsManagementPage: createLazyPageObject(EntityAnalyticsManagementPage, page),
    cspmIntegrationPage: createLazyPageObject(CspmIntegrationPage, page),
    timelinePage: createLazyPageObject(TimelinePage, page),
    detectionsAttackDiscoveryPage: createLazyPageObject(
      DetectionsAttackDiscoveryPage,
      page,
      config
    ),
    attackDetailsRightPanelPage: createLazyPageObject(AttackDetailsRightPanelPage, page),
  };
}
