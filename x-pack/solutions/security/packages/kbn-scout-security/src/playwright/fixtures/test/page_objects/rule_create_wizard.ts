/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS, DATA_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';

/**
 * Custom query rule create wizard: Define → About → Schedule → Actions.
 */
export class RuleCreateWizardPage {
  readonly defineStep: Locator;
  readonly defineContinue: Locator;
  readonly aboutRuleName: Locator;
  readonly aboutRuleDescription: Locator;
  readonly aboutContinue: Locator;
  readonly scheduleContinue: Locator;
  readonly createWithoutEnabling: Locator;
  readonly queryInput: Locator;
  readonly advancedSettingsToggle: Locator;
  readonly mitreLoadingSpinner: Locator;
  readonly addMitreTacticButton: Locator;
  readonly addMitreTechniqueButton: Locator;
  readonly addMitreSubtechniqueButton: Locator;
  readonly ruleDetailsTitle: Locator;
  readonly savedThreatTactics: Locator;
  readonly savedThreatTechniques: Locator;
  readonly savedThreatSubtechniques: Locator;

  constructor(private readonly page: ScoutPage) {
    this.defineStep = this.page.testSubj.locator('stepDefineRule');
    this.defineContinue = this.page.testSubj.locator('define-continue');
    this.aboutRuleName = this.page.testSubj
      .locator('detectionEngineStepAboutRuleName')
      .locator('[data-test-subj="input"]');
    this.aboutRuleDescription = this.page.testSubj
      .locator('detectionEngineStepAboutRuleDescription')
      .locator('[data-test-subj="input"]');
    this.aboutContinue = this.page.testSubj.locator('about-continue');
    this.scheduleContinue = this.page.testSubj.locator('schedule-continue');
    this.createWithoutEnabling = this.page.testSubj.locator('create-enabled-false');
    this.queryInput = this.page.testSubj
      .locator('defineRuleFormStepQueryEditor')
      .locator('[data-test-subj="queryInput"]')
      .filter({ visible: true });
    // Uses the stable `advancedSettingsButton` test subject applied via
    // EuiAccordion's `buttonProps` — avoids the EUI-internal `.euiAccordion__button` class.
    this.advancedSettingsToggle = this.page.testSubj.locator('advancedSettingsButton');
    this.mitreLoadingSpinner = this.page.testSubj.locator('mitreAttackLoading');
    this.addMitreTacticButton = this.page.testSubj.locator('addMitreAttackTactic');
    this.addMitreTechniqueButton = this.page.testSubj.locator('addMitreAttackTechnique');
    this.addMitreSubtechniqueButton = this.page.testSubj.locator('addMitreAttackSubtechnique');
    // Rule details page, reached after the rule is created.
    this.ruleDetailsTitle = this.page.testSubj.locator('header-page-title');
    const aboutSection = this.page.testSubj.locator('aboutRule');
    this.savedThreatTactics = aboutSection.locator('[data-test-subj="threatTacticLink"]');
    this.savedThreatTechniques = aboutSection.locator('[data-test-subj="threatTechniqueLink"]');
    this.savedThreatSubtechniques = aboutSection.locator(
      '[data-test-subj="threatSubtechniqueLink"]'
    );
  }

  /**
   * Opens `/security/rules/create` and walks Define → About → Schedule.
   * Hidden wizard steps stay in the DOM with `display:none` (kibana#248743).
   */
  async completeUntilActionsStep({
    name,
    description = name,
    query,
    onAboutStep,
  }: {
    name: string;
    description?: string;
    query: string;
    /** Optional async callback invoked after the About fields are filled and
     * before the About "Continue" button is clicked. Use it to interact with
     * About-step controls (e.g. the MITRE picker) without duplicating the
     * surrounding wizard navigation. */
    onAboutStep?: () => Promise<void>;
  }): Promise<void> {
    // The rules table swaps `create-new-rule` for `create-rule-button` when AI
    // rule creation is available, so open the wizard URL directly.
    await this.page.gotoApp('security/rules/create');
    await this.defineStep.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });

    // Stays disabled while user-info / lists init and the ad-hoc data view create.
    await this.queryInput.and(this.page.locator(':enabled')).waitFor({
      state: 'visible',
      timeout: APP_LOAD_TIMEOUT_MS,
    });
    await this.queryInput.click();
    // QueryStringInput ignores fill() — it syncs from React props.
    await this.queryInput.pressSequentially(query);
    await this.page.keyboard.press('Enter');

    await this.defineContinue.click();
    await this.aboutRuleName.waitFor({ state: 'visible' });
    await this.aboutRuleName.fill(name);
    await this.aboutRuleDescription.fill(description);
    if (onAboutStep) {
      await onAboutStep();
    }
    await this.aboutContinue.click();

    await this.scheduleContinue.waitFor({ state: 'visible' });
    await this.scheduleContinue.click();

    await this.createWithoutEnabling.waitFor({ state: 'visible' });
  }

  /**
   * Clicks "Create rule without enabling" and waits for the rule details page to load.
   * Both create buttons navigate to the same rule details page; this variant leaves
   * the rule disabled so it does not execute against the shared stack.
   */
  async createWithoutEnablingRule(): Promise<void> {
    await this.createWithoutEnabling.click();
    await this.ruleDetailsTitle.waitFor({ state: 'visible', timeout: DATA_LOAD_TIMEOUT_MS });
  }

  /** Expands the Advanced Settings accordion on the About step. */
  async expandAdvancedSettings(): Promise<void> {
    await this.advancedSettingsToggle.click();
  }

  /**
   * Waits for the MITRE ATT&CK section to finish loading.
   *
   * A detached-check on the spinner alone is not sufficient: the section mounts
   * only after the advanced settings accordion expands, so before React renders
   * it neither the spinner nor the controls exist and the check passes against
   * nothing. Wait for the "Add tactic" button — which the component renders only
   * once the entities have resolved — then confirm the spinner is gone.
   */
  async waitForMitreLoaded(): Promise<void> {
    await this.addMitreTacticButton.waitFor({
      state: 'visible',
      timeout: DATA_LOAD_TIMEOUT_MS,
    });
    await this.mitreLoadingSpinner.waitFor({
      state: 'detached',
      timeout: DATA_LOAD_TIMEOUT_MS,
    });
  }

  /**
   * Selects a tactic in the MITRE ATT&CK tactic super-select by the tactic's
   * `id` value (e.g. `'TA9001'`). Using the value is preferred over label
   * matching because EUI renders each option with `id={value}`, making it a
   * stable hook independent of the display label format ("Name (ID)").
   */
  async selectMitreTacticById(tacticId: string): Promise<void> {
    await this.page.components.superSelect('mitreAttackTactic').selectOptionByValue(tacticId);
  }

  /**
   * Clicks "Add technique", then selects the technique in the newly-added
   * technique super-select by the technique's `id` value (e.g. `'T9001'`).
   */
  async addAndSelectMitreTechniqueById(techniqueId: string): Promise<void> {
    await this.addMitreTechniqueButton.click();
    await this.page.components.superSelect('mitreAttackTechnique').selectOptionByValue(techniqueId);
  }

  /**
   * Clicks "Add subtechnique", then selects the subtechnique in the newly-added
   * subtechnique super-select by the subtechnique's `id` value (e.g. `'T9001.001'`).
   */
  async addAndSelectMitreSubtechniqueById(subtechniqueId: string): Promise<void> {
    await this.addMitreSubtechniqueButton.click();
    await this.page.components
      .superSelect('mitreAttackSubtechnique')
      .selectOptionByValue(subtechniqueId);
  }
}
