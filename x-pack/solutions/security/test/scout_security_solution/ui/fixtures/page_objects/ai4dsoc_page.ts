/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

export class Ai4dsocPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(url: string) {
    await this.page.goto(url);
    await waitForPageReady(this.page);
  }

  public get alertsSummaryPrompt() {
    return this.page.testSubj.locator('alert-summary-landing-page-prompt');
  }

  public get getStartedPage() {
    return this.page.testSubj.locator('onboarding-hub-page');
  }

  public get appNotFoundPage() {
    return this.page.testSubj.locator('appNotFoundPageContent');
  }

  public get aiSocNavigation() {
    return this.page.locator('[data-test-subj*="securitySolutionSideNav"]');
  }

  navItemLocator(linkId: string) {
    return this.page.testSubj.locator(`nav-item-id-${linkId}`);
  }

  public get securityFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution');
  }

  public get securityFeatureDescription() {
    return this.page.testSubj.locator('featurePrivilegeDescriptionText');
  }

  public get socManagementSubFeature() {
    return this.page.testSubj.locator('securitySolution_siemV5_soc_management');
  }

  public get securitySubFeatureTable() {
    return this.page.testSubj.locator('securitySolution_siemV5_subFeaturesTable');
  }

  public get casesFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionCasesV3');
  }

  public get machineLearningFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_ml');
  }

  public get elasticAiAssistantFeature() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionAssistant');
  }

  public get attackDiscoveryFeature() {
    return this.page.testSubj.locator(
      'featureCategory_securitySolution_securitySolutionAttackDiscovery'
    );
  }

  timelineFeatureLocator() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionTimeline');
  }

  notesFeatureLocator() {
    return this.page.testSubj.locator('featureCategory_securitySolution_securitySolutionNotes');
  }

  siemMigrationsFeatureLocator() {
    return this.page.testSubj.locator(
      'featureCategory_securitySolution_securitySolutionSiemMigrations'
    );
  }

  public get assignToSpaceButton() {
    return this.page.testSubj.locator('addSpacePrivilegeButton');
  }

  public get spaceSelectorComboBox() {
    return this.page.testSubj.locator('spaceSelectorComboBox');
  }

  public get securityCategory() {
    return this.page.testSubj.locator('featureCategory_securitySolution');
  }

  public get noPrivilegesPage() {
    return this.page.testSubj.locator('noPrivilegesPage');
  }

  public get mlAccessDenied() {
    return this.page.testSubj.locator('mlAccessDenied');
  }
}
