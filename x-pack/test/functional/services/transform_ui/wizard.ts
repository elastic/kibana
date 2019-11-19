/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformWizardProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

  return {
    async clickNextButton() {
      await testSubjects.existOrFail('transformWizardNavButtonNext');
      await testSubjects.clickWhenNotDisabled('transformWizardNavButtonNext');
    },

    async assertDefineStepActive() {
      await testSubjects.existOrFail('transformStepDefineForm');
    },

    async assertDefineSummaryExists() {
      await testSubjects.existOrFail('transformStepDefineSummary');
    },

    async assertDetailsStepActive() {
      await testSubjects.existOrFail('transformStepDetailsForm');
    },

    async assertDetailsSummaryExists() {
      await testSubjects.existOrFail('transformStepDetailsSummary');
    },

    async assertCreateStepActive() {
      await testSubjects.existOrFail('transformStepCreateForm');
    },

    async advanceToDetailsStep() {
      await this.clickNextButton();
      await this.assertDetailsStepActive();
      await this.assertDefineSummaryExists();
    },

    async advanceToCreateStep() {
      await this.clickNextButton();
      await this.assertCreateStepActive();
      await this.assertDefineSummaryExists();
      await this.assertDetailsSummaryExists();
    },

    async assertSourceIndexPreviewExists(subSelector?: string) {
      let selector = 'transformSourceIndexPreview';
      if (subSelector !== undefined) {
        selector = `${selector} ${subSelector}`;
      } else {
        selector = `~${selector}`;
      }
      await testSubjects.existOrFail(selector);
    },

    async assertSourceIndexPreviewLoaded() {
      await this.assertSourceIndexPreviewExists('loaded');
    },

    async assertPivotPreviewExists(subSelector?: string) {
      let selector = 'transformPivotPreview';
      if (subSelector !== undefined) {
        selector = `${selector} ${subSelector}`;
      } else {
        selector = `~${selector}`;
      }
      await testSubjects.existOrFail(selector);
    },

    async assertPivotPreviewLoaded() {
      await this.assertPivotPreviewExists('loaded');
    },

    async assertPivotPreviewEmpty() {
      await this.assertPivotPreviewExists('empty');
    },

    async assertQueryInputExists() {
      await testSubjects.existOrFail('tarnsformQueryInput');
    },

    async assertQueryValue(expectedQuery: string) {
      const actualQuery = await testSubjects.getVisibleText('tarnsformQueryInput');
      expect(actualQuery).to.eql(
        expectedQuery,
        `Query input text should be '${expectedQuery}' (got ${actualQuery})`
      );
    },

    async assertAdvancedQueryEditorSwitchExists() {
      await testSubjects.existOrFail(`transformAdvancedQueryEditorSwitch`, { allowHidden: true });
    },

    async assertAdvancedQueryEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformAdvancedQueryEditorSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced query editor switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertGroupByInputExists() {
      await testSubjects.existOrFail('transformGroupBySelection > comboBoxInput');
    },

    async assertGroupByInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformGroupBySelection > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
      });
    },

    async assertGroupByEntryExists(
      index: number,
      expectedLabel: string,
      expectedIntervalLabel?: string
    ) {
      await testSubjects.existOrFail(`transformGroupByEntry ${index}`);

      const actualLabel = await testSubjects.getVisibleText(
        `transformGroupByEntry ${index} > transformGroupByEntryLabel`
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Label for group by entry ${index} should be '${expectedLabel}' (got '${actualLabel}')`
      );

      if (expectedIntervalLabel !== undefined) {
        const actualIntervalLabel = await testSubjects.getVisibleText(
          `transformGroupByEntry ${index} > transformGroupByEntryIntervalLabel`
        );
        expect(actualIntervalLabel).to.eql(
          expectedIntervalLabel,
          `Label for group by entry ${index} should be '${expectedIntervalLabel}' (got '${actualIntervalLabel}')`
        );
      }
    },

    async addGroupByEntry(
      index: number,
      identifier: string,
      expectedLabel: string,
      expectedIntervalLabel?: string
    ) {
      await comboBox.set('transformGroupBySelection > comboBoxInput', identifier);
      await this.assertGroupByInputValue([]);
      await this.assertGroupByEntryExists(index, expectedLabel, expectedIntervalLabel);
    },

    async assertAggregationInputExists() {
      await testSubjects.existOrFail('transformAggregationSelection > comboBoxInput');
    },

    async assertAggregationInputValue(expectedIdentifier: string[]) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'transformAggregationSelection > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
      });
    },

    async assertAggregationEntryExists(index: number, expectedLabel: string) {
      await testSubjects.existOrFail(`transformAggregationEntry ${index}`);

      const actualLabel = await testSubjects.getVisibleText(
        `transformAggregationEntry ${index} > transformAggregationEntryLabel`
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Label for aggregation entry ${index} should be '${expectedLabel}' (got '${actualLabel}')`
      );
    },

    async addAggregationEntry(index: number, identifier: string, expectedLabel: string) {
      await comboBox.set('transformAggregationSelection > comboBoxInput', identifier);
      await this.assertAggregationInputValue([]);
      await this.assertAggregationEntryExists(index, expectedLabel);
    },

    async assertAdvancedPivotEditorSwitchExists() {
      await testSubjects.existOrFail(`transformAdvancedPivotEditorSwitch`, { allowHidden: true });
    },

    async assertAdvancedPivotEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformAdvancedPivotEditorSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced pivot editor switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertTransformIdInputExists() {
      await testSubjects.existOrFail('transformIdInput');
    },

    async assertTransformIdValue(expectedValue: string) {
      const actualTransformId = await testSubjects.getAttribute('transformIdInput', 'value');
      expect(actualTransformId).to.eql(
        expectedValue,
        `Transform id input text should be ${expectedValue} (got ${actualTransformId})`
      );
    },

    async setTransformId(transformId: string) {
      await testSubjects.setValue('transformIdInput', transformId, { clearWithKeyboard: true });
      await this.assertTransformIdValue(transformId);
    },

    async assertTransformDescriptionInputExists() {
      await testSubjects.existOrFail('transformDescriptionInput');
    },

    async assertTransformDescriptionValue(expectedValue: string) {
      const actualTransformDescription = await testSubjects.getAttribute(
        'transformDescriptionInput',
        'value'
      );
      expect(actualTransformDescription).to.eql(
        expectedValue,
        `Transform description input text should be ${expectedValue} (got ${actualTransformDescription})`
      );
    },

    async setTransformDescription(transformDescription: string) {
      await testSubjects.setValue('transformDescriptionInput', transformDescription, {
        clearWithKeyboard: true,
      });
      await this.assertTransformDescriptionValue(transformDescription);
    },

    async assertDestinationIndexInputExists() {
      await testSubjects.existOrFail('transformDestinationIndexInput');
    },

    async assertDestinationIndexValue(expectedValue: string) {
      const actualDestinationIndex = await testSubjects.getAttribute(
        'transformDestinationIndexInput',
        'value'
      );
      expect(actualDestinationIndex).to.eql(
        expectedValue,
        `Destination index input text should be ${expectedValue} (got ${actualDestinationIndex})`
      );
    },

    async setDestinationIndex(destinationIndex: string) {
      await testSubjects.setValue('transformDestinationIndexInput', destinationIndex, {
        clearWithKeyboard: true,
      });
      await this.assertDestinationIndexValue(destinationIndex);
    },

    async assertCreateIndexPatternSwitchExists() {
      await testSubjects.existOrFail(`transformCreateIndexPatternSwitch`, { allowHidden: true });
    },

    async assertCreateIndexPatternSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformCreateIndexPatternSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Create index pattern switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertContinuousModeSwitchExists() {
      await testSubjects.existOrFail(`transformContinuousModeSwitch`, { allowHidden: true });
    },

    async assertContinuousModeSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute('transformContinuousModeSwitch', 'aria-checked')) ===
        'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Continuous mode switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertCreateAndStartButtonExists() {
      await testSubjects.existOrFail(`transformWizardCreateAndStartButton`);
    },

    async assertCreateButtonExists() {
      await testSubjects.existOrFail(`transformWizardCreateButton`);
    },

    async assertCopyToClipboardButtonExists() {
      await testSubjects.existOrFail(`transformWizardCopyToClipboardButton`);
    },

    async assertStartButtonExists() {
      await testSubjects.existOrFail(`transformWizardStartButton`);
    },

    async assertManagementCardExists() {
      await testSubjects.existOrFail(`transformWizardCardManagement`);
    },

    async returnToManagement() {
      await testSubjects.click('transformWizardCardManagement');
      await testSubjects.existOrFail('transformPageTransformList');
    },

    async assertDiscoverCardExists() {
      await testSubjects.existOrFail(`transformWizardCardDiscover`);
    },

    async assertProgressbarExists() {
      await testSubjects.existOrFail(`transformWizardProgressBar`);
    },

    async waitForProgressBarComplete() {
      await retry.tryForTime(60 * 1000, async () => {
        const actualValue = await testSubjects.getAttribute('transformWizardProgressBar', 'value');
        if (actualValue === '100') {
          return true;
        } else {
          throw new Error(`Expected progress bar value to be 100 (got ${actualValue})`);
        }
      });
    },

    async createTransform() {
      await testSubjects.click('transformWizardCreateButton');
      await this.assertStartButtonExists();
      await this.assertManagementCardExists();
      expect(await testSubjects.isEnabled('transformWizardCreateButton')).to.eql(
        false,
        'The create button should not be enabled any more'
      );
    },

    async startTransform() {
      await testSubjects.click('transformWizardStartButton');
      await this.assertDiscoverCardExists();
      expect(await testSubjects.isEnabled('transformWizardStartButton')).to.eql(
        false,
        'The start button should not be enabled any more'
      );
      await this.assertProgressbarExists();
    },
  };
}
