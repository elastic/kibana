/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataVisualizerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async assertDataVisualizerImportDataCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardImportData');
    },

    async assertDataVisualizerIndexDataCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardIndexData');
    },

    async assertDataVisualizerStartTrialCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardStartTrial');
    },

    async assertSelectIndexButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlDataVisualizerSelectIndexButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "select index" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertUploadFileButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlDataVisualizerUploadFileButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "upload file" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertStartTrialButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlDataVisualizerStartTrialButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "start trial" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },
    async navigateToESQLVisualizer() {
      await testSubjects.click('mlDataVisualizerSelectESQLButton');
      await testSubjects.existOrFail('dataVisualizerIndexPage');
    },

    async navigateToDataViewSelection() {
      await testSubjects.click('mlDataVisualizerSelectIndexButton');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async navigateToFileUpload() {
      await testSubjects.click('mlDataVisualizerUploadFileButton');
      await testSubjects.existOrFail('dataVisualizerPageFileUpload');
    },

    async setESQLQuery(query: string) {
      await retry.tryForTime(5000, async () => {
        const superDatePickerApplyTimeButton = await testSubjects.exists(
          'superDatePickerApplyTimeButton'
        );
        const refreshOrUpdateBtnSelector = superDatePickerApplyTimeButton
          ? 'superDatePickerApplyTimeButton'
          : 'mlDatePickerRefreshPageButton loaded';
        const visibleText = await testSubjects.getVisibleText(refreshOrUpdateBtnSelector);

        expect(visibleText).to.eql('Refresh');

        await testSubjects.existOrFail('kibanaCodeEditor');
        await find.setValueByClass('kibanaCodeEditor', query);

        const updatedVisibleText = await testSubjects.getVisibleText(refreshOrUpdateBtnSelector);

        expect(updatedVisibleText).to.eql('Update');

        await testSubjects.click(refreshOrUpdateBtnSelector);
      });
    },

    async assertLimitSize(size: 5000 | 10000 | 100000) {
      await testSubjects.existOrFail(`dvESQLLimitSize-${size}`, { timeout: 1000 });
    },

    async setLimitSize(size: 5000 | 10000) {
      await retry.tryForTime(5000, async () => {
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);

        // Once clicked, show list of options
        await testSubjects.clickWhenNotDisabled('dvESQLLimitSizeSelect');
        for (const option of [5000, 10000]) {
          await testSubjects.existOrFail(`dvESQLLimitSize-${option}`, { timeout: 1000 });
        }

        // Once option selected, assert if limit size is updated
        await testSubjects.click(`dvESQLLimitSize-${size}`);
        await this.assertLimitSize(size);
      });
    },
  };
}
