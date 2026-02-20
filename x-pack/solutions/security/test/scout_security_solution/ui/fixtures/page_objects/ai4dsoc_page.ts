/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class Ai4dsocPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(url: string) {
    await this.page.goto(url);
  }

  get alertsSummaryPrompt() {
    return this.page.testSubj.locator('alert-summary-landing-page-prompt');
  }

  get getStartedPage() {
    return this.page.testSubj.locator('onboarding-hub-page');
  }

  get appNotFoundPage() {
    return this.page.testSubj.locator('appNotFoundPageContent');
  }

  get aiSocNavigation() {
    return this.page.locator('[data-test-subj*="securitySolutionSideNav"]');
  }

  navItemLocator(linkId: string) {
    return this.page.testSubj.locator(`nav-item-id-${linkId}`);
  }

  get securityFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution');
  }

  get securityFeatureDescription() {
    return this.page.testSubj.locator('featurePrivilegeDescriptionText');
  }

  get socManagementSubFeature() {
    return this.page.testSubj.locator('securitySolution_siemV5_soc_management');
  }

  get securitySubFeatureTable() {
    return this.page.testSubj.locator('securitySolution_siemV5_subFeaturesTable');
  }

  get casesFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionCasesV3');
  }

  get machineLearningFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_ml');
  }

  get elasticAiAssistantFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionAssistant');
  }

  get attackDiscoveryFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionAttackDiscovery');
  }

  timelineFeatureLocator() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionTimeline');
  }

  notesFeatureLocator() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionNotes');
  }

  siemMigrationsFeatureLocator() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionSiemMigrations');
  }

  get assignToSpaceButton() {
    return this.page.testSubj.locator('addSpacePrivilegeButton');
  }

  get spaceSelectorComboBox() {
    return this.page.testSubj.locator('spaceSelectorComboBox');
  }

  get securityCategory() {
    return this.page.testSubj.locator('featureCategory_securitySolution');
  }

  get noPrivilegesPage() {
    return this.page.testSubj.locator('noPrivilegesPage');
  }

  get mlAccessDenied() {
    return this.page.testSubj.locator('mlAccessDenied');
  }
}
