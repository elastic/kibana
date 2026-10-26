/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { INGEST_STEP_APP, PATH_SELECTION_APP, SEARCH_STEP_APP, VECTORDB_APP } from '../constants';

export type VectorPath = 'generate-vectors' | 'have-vectors';
export type WizardStep = 'ingest' | 'search';

export class OnboardingPage {
  // Path selection
  public readonly generatePathCard;
  public readonly storePathCard;
  public readonly skipSetupButton;
  public readonly documentationLink;
  public readonly copyEndpointUrlButton;
  public readonly viewPromptButton;
  public readonly installCliButton;
  public readonly openElasticAgentButton;
  public readonly agentBuilderSidebar;

  // Wizard steps
  public readonly stepRail;
  public readonly snippet;
  public readonly backButton;
  public readonly continueButton;
  public readonly completeSetupButton;
  public readonly languagePicker;

  constructor(private readonly page: ScoutPage) {
    this.generatePathCard = this.page.getByTestId('vectordbPathSelectionGenerate');
    this.storePathCard = this.page.getByTestId('vectordbPathSelectionStore');
    this.skipSetupButton = this.page.getByTestId('vectordbPathSelectionSkip');
    this.documentationLink = this.page.getByTestId('vectordbPathSelectionDocumentation');
    this.copyEndpointUrlButton = this.page.getByTestId('vectordbConnectToProjectCopyUrl');
    this.viewPromptButton = this.page.getByTestId('vectordbOnboardingViewPrompt');
    this.installCliButton = this.page.getByTestId('vectordbOnboardingInstallCli');
    this.openElasticAgentButton = this.page.getByTestId('vectordbOnboardingOpenElasticAgent');
    this.agentBuilderSidebar = this.page.getByTestId('sidebarPanel');

    this.stepRail = this.page.getByTestId('vectordbWizardSteps');
    this.snippet = this.page.getByTestId('vectordbWizardSnippet');
    this.backButton = this.page.getByTestId('stepLayoutBackToOnboarding');
    this.continueButton = this.page.getByTestId('vectordbWizardContinueToSearch');
    this.completeSetupButton = this.page.getByTestId('vectordbWizardCompleteSetup');
    this.languagePicker = this.page.getByTestId('vectordbWizardLanguagePicker');
  }

  /** Navigates to the app root, which redirects a first-time user into the setup guide. */
  async gotoAppRoot() {
    await this.page.gotoApp(VECTORDB_APP);
  }

  async gotoPathSelection() {
    await this.page.gotoApp(PATH_SELECTION_APP);
    await this.generatePathCard.waitFor({ state: 'visible' });
  }

  async gotoIngestStep(path?: VectorPath) {
    await this.page.gotoApp(INGEST_STEP_APP, path ? { params: { path } } : undefined);
  }

  async gotoSearchStep(path: VectorPath) {
    await this.page.gotoApp(SEARCH_STEP_APP, { params: { path } });
  }

  stepTitle(path: VectorPath, step: WizardStep) {
    return this.page.getByTestId(`vectordbWizardStepTitle-${path}-${step}`);
  }

  snippetTab(tabId: string) {
    return this.page.getByTestId(`vectordbWizardSnippetTab-${tabId}`);
  }

  pill(pillId: string) {
    return this.page.getByTestId(`vectordbWizardPill-${pillId}`);
  }

  async choosePath(path: VectorPath) {
    const card = path === 'generate-vectors' ? this.generatePathCard : this.storePathCard;
    await card.click();
    await this.stepRail.waitFor({ state: 'visible' });
  }

  async selectSnippetTab(tabId: string) {
    await this.snippetTab(tabId).click();
  }

  async selectLanguage(languageId: string) {
    await this.languagePicker.click();
    await this.page.getByTestId(`vectordbWizardLanguageOption-${languageId}`).click();
  }

  /** Opens a pill's popover and returns the panel holding its explanation. */
  async openPill(pillId: string) {
    await this.pill(pillId).click();
    return this.page.getByTestId(`vectordbWizardPillPanel-${pillId}`);
  }
}
