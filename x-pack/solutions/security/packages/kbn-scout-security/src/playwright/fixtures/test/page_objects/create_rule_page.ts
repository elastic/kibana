/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/rules/create';

export class CreateRulePage {
  // --- Define step ---
  readonly importQueryFromTimelineLink: Locator;
  readonly defineContinueButton: Locator;
  readonly defineEditButton: Locator;
  readonly customQueryInput: Locator;

  // --- About step ---
  readonly ruleNameInput: Locator;
  readonly ruleDescriptionInput: Locator;
  readonly aboutContinueButton: Locator;
  readonly advancedSettingsButton: Locator;
  readonly maxSignalsInput: Locator;
  readonly setupGuideTextarea: Locator;

  // --- Schedule step ---
  readonly lookBackInterval: Locator;
  readonly lookBackTimeType: Locator;
  readonly scheduleContinueButton: Locator;

  // --- Final step ---
  readonly createAndEnableButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.importQueryFromTimelineLink = this.page.testSubj.locator('importQueryFromSavedTimeline');
    this.defineContinueButton = this.page.testSubj.locator('define-continue');
    this.defineEditButton = this.page.testSubj.locator('edit-define-rule');
    this.customQueryInput = this.page.testSubj.locator('queryInput');

    this.ruleNameInput = this.page.testSubj
      .locator('detectionEngineStepAboutRuleName')
      .locator('[data-test-subj="input"]');
    this.ruleDescriptionInput = this.page.testSubj
      .locator('detectionEngineStepAboutRuleDescription')
      .locator('[data-test-subj="input"]');
    this.aboutContinueButton = this.page.testSubj.locator('about-continue');
    this.advancedSettingsButton = this.page.testSubj.locator('advancedSettings');
    this.maxSignalsInput = this.page.testSubj.locator('detectionEngineStepAboutRuleMaxSignals');
    this.setupGuideTextarea = this.page.testSubj
      .locator('detectionEngineStepAboutRuleSetup')
      .locator('textarea');

    this.lookBackInterval = this.page.testSubj
      .locator('detectionEngineStepScheduleRuleFrom')
      .locator('[data-test-subj="interval"]');
    this.lookBackTimeType = this.page.testSubj
      .locator('detectionEngineStepScheduleRuleFrom')
      .locator('[data-test-subj="timeType"]');
    this.scheduleContinueButton = this.page.testSubj.locator('schedule-continue');

    this.createAndEnableButton = this.page.testSubj.locator('create-enable');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
    await this.importQueryFromTimelineLink.waitFor({ timeout: 30000 });
  }

  async importQueryFromTimeline(timelineId: string) {
    await this.importQueryFromTimelineLink.click();
    await this.page.testSubj.locator(`timeline-title-${timelineId}`).click();
  }

  async fillRuleName(name: string) {
    await this.ruleNameInput.waitFor();
    await this.ruleNameInput.fill(name);
  }

  async fillRuleDescription(description: string) {
    await this.ruleDescriptionInput.fill(description);
  }

  async fillMaxSignals(value: number) {
    await this.maxSignalsInput.fill(value.toString());
  }

  async fillSetupGuide(text: string) {
    await this.setupGuideTextarea.fill(text);
  }

  async expandAdvancedSettings() {
    await this.advancedSettingsButton.click();
  }

  async fillLookBack(value: string, unit: string) {
    await this.lookBackInterval.fill(value);
    await this.lookBackTimeType.selectOption(unit);
  }

  async createAndEnable() {
    await this.createAndEnableButton.click();
    await this.createAndEnableButton.waitFor({ state: 'hidden' });
  }
}
