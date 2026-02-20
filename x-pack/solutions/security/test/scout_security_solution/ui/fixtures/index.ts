/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { createLazyPageObject } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout-security';
import type { SecurityPageObjects } from '@kbn/scout-security';
import {
  ExplorePage,
  SecurityCommonPage,
  TimelinePage,
  ThreatIntelligencePage,
  SiemMigrationsPage,
  RulesManagementTablePage,
  DetectionAlertsPage,
  RuleCreationPage,
  RuleEditPage,
  ExceptionsPage,
} from './page_objects';

export interface ScoutSecuritySolutionPageObjects extends SecurityPageObjects {
  explore: ExplorePage;
  securityCommon: SecurityCommonPage;
  timeline: TimelinePage;
  threatIntelligence: ThreatIntelligencePage;
  siemMigrations: SiemMigrationsPage;
  rulesManagementTable: RulesManagementTablePage;
  detectionAlerts: DetectionAlertsPage;
  ruleCreation: RuleCreationPage;
  ruleEdit: RuleEditPage;
  exceptions: ExceptionsPage;
}

const extendedTest = baseTest.extend<{
  pageObjects: ScoutSecuritySolutionPageObjects;
}>({
  pageObjects: async (
    { pageObjects, page }: { pageObjects: SecurityPageObjects; page: ScoutPage },
    use: (po: ScoutSecuritySolutionPageObjects) => Promise<void>
  ) => {
    const extended: ScoutSecuritySolutionPageObjects = {
      ...pageObjects,
      explore: createLazyPageObject(ExplorePage, page),
      securityCommon: createLazyPageObject(SecurityCommonPage, page),
      timeline: createLazyPageObject(TimelinePage, page),
      threatIntelligence: createLazyPageObject(ThreatIntelligencePage, page),
      siemMigrations: createLazyPageObject(SiemMigrationsPage, page),
      rulesManagementTable: createLazyPageObject(RulesManagementTablePage, page),
      detectionAlerts: createLazyPageObject(DetectionAlertsPage, page),
      ruleCreation: createLazyPageObject(RuleCreationPage, page),
      ruleEdit: createLazyPageObject(RuleEditPage, page),
      exceptions: createLazyPageObject(ExceptionsPage, page),
    };
    await use(extended);
  },
});

export { extendedTest as test };
export { expect } from '@kbn/scout-security/ui';
export { tags } from '@kbn/scout-security';
