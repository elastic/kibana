/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataVisualizerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

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

    async navigateToIndexPatternSelection() {
      await testSubjects.click('mlDataVisualizerSelectIndexButton');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async navigateToFileUpload() {
      await testSubjects.click('mlDataVisualizerUploadFileButton');
      await testSubjects.existOrFail('mlPageFileDataVisualizerUpload');
    },
  };
}
