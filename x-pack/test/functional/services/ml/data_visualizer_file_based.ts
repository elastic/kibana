/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningDataVisualizerFileBasedProvider(
  { getService, getPageObjects }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  const PageObjects = getPageObjects(['common']);

  return {
    async selectFile(path: string, expectError: boolean = false) {
      log.debug(`Importing file '${path}' ...`);
      await PageObjects.common.setFileInputPath(path);

      await testSubjects.waitForDeleted('mlPageFileDataVisLoading');

      if (expectError) {
        await testSubjects.existOrFail('~mlFileUploadErrorCallout');
      } else {
        await testSubjects.missingOrFail('~mlFileUploadErrorCallout');
        await testSubjects.existOrFail('mlPageFileDataVisResults');
      }
    },

    async assertFileTitle(expectedTitle: string) {
      const actualTitle = await testSubjects.getVisibleText('mlFileDataVisResultsTitle');
      expect(actualTitle).to.eql(
        expectedTitle,
        `Expected file title to be '${expectedTitle}' (got '${actualTitle}')`
      );
    },

    async assertFileContentPanelExists() {
      await testSubjects.existOrFail('mlFileDataVisFileContentPanel');
    },

    async assertSummaryPanelExists() {
      await testSubjects.existOrFail('mlFileDataVisSummaryPanel');
    },

    async assertFileStatsPanelExists() {
      await testSubjects.existOrFail('mlFileDataVisFileStatsPanel');
    },

    async navigateToFileImport() {
      await testSubjects.click('mlFileDataVisOpenImportPageButton');
      await testSubjects.existOrFail('mlPageFileDataVisImport');
    },

    async assertImportSettingsPanelExists() {
      await testSubjects.existOrFail('mlFileDataVisImportSettingsPanel');
    },

    async assertIndexNameValue(expectedValue: string) {
      const actualIndexName = await testSubjects.getAttribute(
        'mlFileDataVisIndexNameInput',
        'value'
      );
      expect(actualIndexName).to.eql(
        expectedValue,
        `Expected index name to be '${expectedValue}' (got '${actualIndexName}')`
      );
    },

    async setIndexName(indexName: string) {
      await mlCommonUI.setValueWithChecks('mlFileDataVisIndexNameInput', indexName, {
        clearWithKeyboard: true,
      });
      await this.assertIndexNameValue(indexName);
    },

    async assertCreateIndexPatternCheckboxValue(expectedValue: boolean) {
      const isChecked = await testSubjects.isChecked('mlFileDataVisCreateIndexPatternCheckbox');
      expect(isChecked).to.eql(
        expectedValue,
        `Expected create index pattern checkbox to be ${expectedValue ? 'checked' : 'unchecked'}`
      );
    },

    async setCreateIndexPatternCheckboxState(newState: boolean) {
      const isChecked = await testSubjects.isChecked('mlFileDataVisCreateIndexPatternCheckbox');
      if (isChecked !== newState) {
        // this checkbox can't be clicked directly, instead click the corresponding label
        const panel = await testSubjects.find('mlFileDataVisImportSettingsPanel');
        const label = await panel.findByCssSelector('[for="createIndexPattern"]');
        await label.click();
      }
      await this.assertCreateIndexPatternCheckboxValue(newState);
    },

    async startImportAndWaitForProcessing() {
      await testSubjects.clickWhenNotDisabled('mlFileDataVisImportButton');
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('mlFileImportSuccessCallout');
      });
    },
  };
}
