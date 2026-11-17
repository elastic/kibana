/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { EsqlEditor } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS, DATA_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';
import { expect } from '../../../../../ui';

/** One attempt to pick options before the selection is retried. */
const OPTION_ATTEMPT_TIMEOUT_MS = 5_000;

/** Path of the search requests that return the columns of an ES|QL query. */
const ESQL_SEARCH_PATH = '/internal/search/esql';

type ComboBox = ReturnType<ScoutPage['components']['comboBox']>;

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

  /** Timeline of the ES|QL search requests and the clicks on "Continue", for failure messages. */
  private readonly timeline: string[] = [];
  private timelineStart = Date.now();
  private isRecordingRequests = false;

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

    this.recordEsqlSearchRequests();
    await this.page.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
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
    this.recordEvent('query set');
  }

  /** Clicks "Continue" once. Use it when the Define step is expected to stay open on an error. */
  async continueFromDefineStep(): Promise<void> {
    await this.defineContinue.click();
  }

  /**
   * TEMPORARY, for the flaky test runner: clicks "Continue" once and waits for the Define step to
   * collapse, with no retry, so a failure shows the first-click problem. The failure carries the
   * text of the query bar (which includes the validation message) and a timeline of the ES|QL
   * search requests and clicks. Replace it with the fix, or restore a retry, once the cause of
   * the failures of CI runs 15502 and 15505 is known.
   */
  async continueToAboutStep(): Promise<void> {
    this.recordEvent('click Continue');
    await this.defineContinue.click();
    try {
      await expect(this.queryBar).toBeHidden({ timeout: DATA_LOAD_TIMEOUT_MS });
    } catch (error) {
      const queryBarText = (await this.queryBar.textContent()) ?? '';
      throw new Error(
        `The Define step did not close. Query bar: ${queryBarText}\nTimeline:\n${this.timeline.join(
          '\n'
        )}`,
        { cause: error }
      );
    }
  }

  private recordEvent(event: string): void {
    this.timeline.push(`+${Date.now() - this.timelineStart}ms ${event}`);
  }

  private recordEsqlSearchRequests(): void {
    if (this.isRecordingRequests) {
      return;
    }
    this.isRecordingRequests = true;
    this.timelineStart = Date.now();

    this.page.on('request', (request) => {
      if (request.url().includes(ESQL_SEARCH_PATH)) {
        this.recordEvent('ES|QL search request sent');
      }
    });
    this.page.on('response', (response) => {
      if (response.url().includes(ESQL_SEARCH_PATH)) {
        this.recordEvent(`ES|QL search response ${response.status()}`);
      }
    });
    this.page.on('requestfailed', (request) => {
      if (request.url().includes(ESQL_SEARCH_PATH)) {
        this.recordEvent(`ES|QL search request failed: ${request.failure()?.errorText}`);
      }
    });
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
