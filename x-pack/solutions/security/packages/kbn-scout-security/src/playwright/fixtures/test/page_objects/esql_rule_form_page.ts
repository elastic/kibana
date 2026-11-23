/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { EsqlEditor } from '@kbn/scout';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { APP_LOAD_TIMEOUT_MS, DATA_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';
import { expect } from '../../../../../ui';
import { dismissProjectPickerTour } from './helpers/dismiss_project_picker_tour';

/** One attempt to pick options before the selection is retried. */
const OPTION_ATTEMPT_TIMEOUT_MS = 5_000;

/** "Continue" of the Define step when creating a rule, "Save changes" when editing one. */
const SUBMIT_BUTTON_SELECTOR =
  '[data-test-subj="define-continue"], [data-test-subj="ruleEditSubmitButton"]';

type ComboBox = ReturnType<ScoutPage['components']['comboBox']>;

/** Window flag that records whether the button was disabled since the observer was installed. */
type SubmitButtonWindow = Window & { __esqlSubmitButtonWasDisabled?: boolean };

/** Same derivation as the form, which treats a query the parser cannot read as having no index. */
const getIndexPattern = (query: string): string => {
  try {
    return getIndexPatternFromESQLQuery(query);
  } catch {
    return '';
  }
};

/**
 * ES|QL rule form, shared by rule creation and rule editing: the ES|QL query bar and the alert
 * suppression controls of the Define step, and the ES|QL specific fields of the About step
 * (rule name override and investigation fields). The steps shared with every rule type live in
 * `RuleCreateWizardPage`.
 */
export class EsqlRuleFormPage {
  readonly ruleTypeCard: Locator;
  /** Form row of the ES|QL query bar, which also renders the query validation messages. */
  readonly queryBar: Locator;
  readonly esqlEditor: EsqlEditor;
  readonly defineContinue: Locator;
  readonly saveWithErrorsModal: Locator;
  readonly saveWithErrorsConfirmButton: Locator;
  readonly suppressionDurationValue: Locator;
  readonly suppressionDurationUnit: Locator;
  readonly suppressPerRuleExecution: Locator;
  readonly suppressPerTimePeriod: Locator;
  readonly suppressMissingFields: Locator;
  readonly doNotSuppressMissingFields: Locator;

  constructor(private readonly page: ScoutPage) {
    this.ruleTypeCard = this.page.testSubj.locator('esqlRuleType');
    this.queryBar = this.page.testSubj.locator('ruleEsqlQueryBar');
    this.esqlEditor = new EsqlEditor(this.page, 'ruleEsqlQueryBar');
    this.defineContinue = this.page.testSubj.locator('define-continue');
    this.saveWithErrorsModal = this.page.testSubj.locator('save-with-errors-confirmation-modal');
    this.saveWithErrorsConfirmButton = this.saveWithErrorsModal.getByTestId(
      'confirmModalConfirmButton'
    );
    const suppressionDuration = this.page.testSubj.locator('alertSuppressionDuration');
    this.suppressionDurationValue = suppressionDuration.locator('[data-test-subj="interval"]');
    this.suppressionDurationUnit = suppressionDuration.locator('[data-test-subj="timeType"]');
    this.suppressPerRuleExecution = suppressionDuration.getByRole('radio', {
      name: 'Per rule execution',
    });
    this.suppressPerTimePeriod = suppressionDuration.getByRole('radio', {
      name: 'Per time period',
    });
    const missingFieldsOptions = this.page.testSubj.locator('suppressionMissingFieldsOptions');
    this.suppressMissingFields = missingFieldsOptions.getByRole('radio', {
      name: 'Suppress and group alerts for events with missing fields',
      exact: true,
    });
    this.doNotSuppressMissingFields = missingFieldsOptions.getByRole('radio', {
      name: 'Do not suppress alerts for events with missing fields',
      exact: true,
    });
  }

  /** Opens rule creation in the given space, selects the ES|QL rule type and waits for the editor. */
  async gotoCreateEsqlRule(params: { kbnUrl: KibanaUrl; spaceId: string }): Promise<void> {
    const { kbnUrl, spaceId } = params;

    await dismissProjectPickerTour(this.page);
    await this.page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));
    await this.ruleTypeCard.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
    await this.ruleTypeCard.click();
    await this.esqlEditor.waitReady();
    // "Continue" stays disabled until the data view of the form has settled
    await expect(this.defineContinue).toBeEnabled({ timeout: APP_LOAD_TIMEOUT_MS });
  }

  /** Replaces the query of the ES|QL editor. */
  async setQuery(query: string): Promise<void> {
    await this.esqlEditor.setQuery(query);
  }

  /**
   * Replaces the query and waits for the form to settle. About 300 ms after the index pattern of
   * the query changes, the form resolves the data view again. "Continue" (or "Save changes" when
   * editing a rule) is disabled until it is done, and a click that lands in that window is ignored.
   * The window lasts from tens of milliseconds to over a second, depending on the load of the
   * machine. Polling the button can miss a short window, therefore we use an observer in the page
   * to record this behaviour. The wait only applies when the index pattern changes. Otherwise the
   * button stays enabled.
   */
  async setQueryAndWaitToSettle(query: string): Promise<void> {
    const previousQuery = await this.esqlEditor.getQuery();
    const hasNewIndexPattern = getIndexPattern(previousQuery) !== getIndexPattern(query);

    if (!hasNewIndexPattern) {
      await this.setQuery(query);
      return;
    }

    await this.runAndWaitForSubmitButtonToBeEnabled(() => this.setQuery(query));
  }

  private async runAndWaitForSubmitButtonToBeEnabled(action: () => Promise<void>): Promise<void> {
    await this.recordWhenSubmitButtonIsDisabled();
    await action();
    await this.waitForSubmitButtonToBeEnabledAgain();
  }

  /**
   * Installs an observer in the page that remembers that the submit button was disabled. The
   * observer sees windows that polling from the test can miss.
   */
  private async recordWhenSubmitButtonIsDisabled(): Promise<void> {
    await this.page.evaluate((selector) => {
      const buttonWindow: SubmitButtonWindow = window;
      buttonWindow.__esqlSubmitButtonWasDisabled = false;

      const observer = new MutationObserver(() => {
        const button = document.querySelector<HTMLButtonElement>(selector);
        if (button?.disabled) {
          buttonWindow.__esqlSubmitButtonWasDisabled = true;
        }
      });
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['disabled'],
      });
    }, SUBMIT_BUTTON_SELECTOR);
  }

  private async waitForSubmitButtonToBeEnabledAgain(): Promise<void> {
    await this.page.waitForFunction(
      (selector) => {
        const button = document.querySelector<HTMLButtonElement>(selector);
        return (
          (window as SubmitButtonWindow).__esqlSubmitButtonWasDisabled === true &&
          button?.disabled === false
        );
      },
      SUBMIT_BUTTON_SELECTOR,
      { timeout: DATA_LOAD_TIMEOUT_MS }
    );
  }

  /** Clicks "Continue" once. Use it when the Define step is expected to stay open on an error. */
  async continueFromDefineStep(): Promise<void> {
    await this.defineContinue.click();
  }

  /**
   * Clicks "Continue" once and waits for the Define step to collapse. Set the query with
   * `setQueryAndWaitToSettle` first, so the click cannot land while "Continue" is disabled.
   */
  async continueToAboutStep(): Promise<void> {
    await this.defineContinue.click();
    await expect(this.queryBar).toBeHidden({ timeout: DATA_LOAD_TIMEOUT_MS });
  }

  /** Picks the field that provides the rule name in the "Rule name override" control. */
  async selectRuleNameOverride(fieldName: string): Promise<void> {
    await this.selectOptionsOnceLoaded(
      this.page.components.comboBox(
        'esqlAutocompleteComboBox',
        this.page.testSubj.locator('detectionEngineStepAboutRuleRuleNameOverrideForEsqlRuleType')
      ),
      [fieldName]
    );
  }

  /** Picks fields in "Custom highlighted fields". Its options come from the columns of the query. */
  async selectInvestigationFields(fieldNames: readonly string[]): Promise<void> {
    await this.selectOptionsOnceLoaded(
      this.page.components.comboBox(
        'input',
        this.page.testSubj.locator('detectionEngineStepAboutRuleInvestigationFields')
      ),
      fieldNames
    );
  }

  /** The "Suppress alerts by" combo box; use it to read the saved selection. */
  suppressionFields() {
    return this.page.components.comboBox(
      'input',
      this.page.testSubj.locator('alertSuppressionInput')
    );
  }

  /** Picks the "Suppress alerts by" fields. Their options come from the columns of the query. */
  async selectSuppressionFields(fieldNames: readonly string[]): Promise<void> {
    await this.selectOptionsOnceLoaded(this.suppressionFields(), fieldNames);
  }

  /**
   * Picks options of a combo box whose options come from the columns of the query. The control
   * closes its dropdown when it starts loading those columns, which happens shortly after the
   * query changes, so a single attempt can wait on a dropdown that is already closed. Picking is
   * idempotent, so the whole selection is retried until the columns are loaded.
   */
  private async selectOptionsOnceLoaded(
    comboBox: ComboBox,
    fieldNames: readonly string[]
  ): Promise<void> {
    await expect(async () => {
      await comboBox.setSelectedOptions([...fieldNames], { timeout: OPTION_ATTEMPT_TIMEOUT_MS });
    }).toPass({ timeout: DATA_LOAD_TIMEOUT_MS });
  }

  async confirmSaveWithErrors(): Promise<void> {
    await this.saveWithErrorsConfirmButton.click();
  }
}
