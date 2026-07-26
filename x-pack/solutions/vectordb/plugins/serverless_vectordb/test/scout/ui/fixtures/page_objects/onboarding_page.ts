/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/** Onboarding landing page (path selection) and the ingest/search wizard steps. */
export class VectordbOnboardingPage {
  // Path selection landing page
  readonly generatePathCard: Locator;
  readonly storePathCard: Locator;
  readonly skipButton: Locator;
  readonly documentationLink: Locator;

  // Wizard steps (ingest/search)
  readonly snippet: Locator;
  readonly languagePicker: Locator;
  readonly copyCodeButton: Locator;
  readonly runInConsoleButton: Locator;
  readonly stepsRail: Locator;
  readonly continueToSearchButton: Locator;
  readonly completeSetupButton: Locator;
  readonly backButton: Locator;
  readonly connectionDetailsButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.generatePathCard = page.testSubj.locator('vectordbPathSelectionGenerate');
    this.storePathCard = page.testSubj.locator('vectordbPathSelectionStore');
    this.skipButton = page.testSubj.locator('vectordbPathSelectionSkip');
    this.documentationLink = page.testSubj.locator('vectordbPathSelectionDocumentation');

    this.snippet = page.testSubj.locator('vectordbWizardSnippet');
    this.languagePicker = page.testSubj.locator('vectordbWizardLanguagePicker');
    this.copyCodeButton = page.testSubj.locator('vectordbWizardCopyCode');
    this.runInConsoleButton = page.testSubj.locator('vectordbWizardRunInConsole');
    this.stepsRail = page.testSubj.locator('vectordbWizardSteps');
    this.continueToSearchButton = page.testSubj.locator('vectordbWizardContinueToSearch');
    this.completeSetupButton = page.testSubj.locator('vectordbWizardCompleteSetup');
    this.backButton = page.testSubj.locator('stepLayoutBackToOnboarding');
    this.connectionDetailsButton = page.testSubj.locator('openConnectionDetails');
  }

  async goto() {
    await this.page.gotoApp('vectordb');
  }

  languageOption(languageId: string): Locator {
    return this.page.testSubj.locator(`vectordbWizardLanguageOption-${languageId}`);
  }

  async selectLanguage(languageId: string) {
    await this.languagePicker.click();
    await this.languageOption(languageId).click();
  }
}
