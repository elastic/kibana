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
  RuleDetailsPage,
  ExceptionsPage,
  ExpandableFlyoutPage,
  AlertFiltersPage,
  RuleGapsPage,
  Ai4dsocPage,
  AssetInventoryPage,
  AssetInventoryOnboardingPage,
  AutomaticImportPage,
  PrebuiltRulesPage,
  EntityAnalyticsManagementPage,
  EntityAnalyticsAssetCriticalityPage,
  EntityAnalyticsFlyoutPage,
  EntityAnalyticsThreatHuntingPage,
  EntityAnalyticsPrivMonPage,
  EntityAnalyticsRiskInfoPage,
  EntityAnalyticsAnomaliesPage,
  HostRiskTabPage,
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
  ruleDetails: RuleDetailsPage;
  exceptions: ExceptionsPage;
  expandableFlyout: ExpandableFlyoutPage;
  alertFilters: AlertFiltersPage;
  ruleGaps: RuleGapsPage;
  ai4dsoc: Ai4dsocPage;
  assetInventory: AssetInventoryPage;
  assetInventoryOnboarding: AssetInventoryOnboardingPage;
  automaticImport: AutomaticImportPage;
  prebuiltRules: PrebuiltRulesPage;
  entityAnalyticsManagement: EntityAnalyticsManagementPage;
  entityAnalyticsAssetCriticality: EntityAnalyticsAssetCriticalityPage;
  entityAnalyticsFlyout: EntityAnalyticsFlyoutPage;
  entityAnalyticsThreatHunting: EntityAnalyticsThreatHuntingPage;
  entityAnalyticsPrivMon: EntityAnalyticsPrivMonPage;
  entityAnalyticsRiskInfo: EntityAnalyticsRiskInfoPage;
  entityAnalyticsAnomalies: EntityAnalyticsAnomaliesPage;
  hostRiskTab: HostRiskTabPage;
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
      ruleDetails: createLazyPageObject(RuleDetailsPage, page),
      exceptions: createLazyPageObject(ExceptionsPage, page),
      expandableFlyout: createLazyPageObject(ExpandableFlyoutPage, page),
      alertFilters: createLazyPageObject(AlertFiltersPage, page),
      ruleGaps: createLazyPageObject(RuleGapsPage, page),
      ai4dsoc: createLazyPageObject(Ai4dsocPage, page),
      assetInventory: createLazyPageObject(AssetInventoryPage, page),
      assetInventoryOnboarding: createLazyPageObject(AssetInventoryOnboardingPage, page),
      automaticImport: createLazyPageObject(AutomaticImportPage, page),
      prebuiltRules: createLazyPageObject(PrebuiltRulesPage, page),
      entityAnalyticsManagement: createLazyPageObject(EntityAnalyticsManagementPage, page),
      entityAnalyticsAssetCriticality: createLazyPageObject(
        EntityAnalyticsAssetCriticalityPage,
        page
      ),
      entityAnalyticsFlyout: createLazyPageObject(EntityAnalyticsFlyoutPage, page),
      entityAnalyticsThreatHunting: createLazyPageObject(EntityAnalyticsThreatHuntingPage, page),
      entityAnalyticsPrivMon: createLazyPageObject(EntityAnalyticsPrivMonPage, page),
      entityAnalyticsRiskInfo: createLazyPageObject(EntityAnalyticsRiskInfoPage, page),
      entityAnalyticsAnomalies: createLazyPageObject(EntityAnalyticsAnomaliesPage, page),
      hostRiskTab: createLazyPageObject(HostRiskTabPage, page),
    };
    await use(extended);
  },
});

export { extendedTest as test };
export { expect } from '@kbn/scout-security/ui';
export { tags } from '@kbn/scout-security';
