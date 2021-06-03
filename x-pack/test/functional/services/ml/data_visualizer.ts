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

  return {
    async assertDataVisualizerImportDataCardExists() {
      await testSubjects.existOrFail('dataVisualizerCardImportData');
    },

    async assertDataVisualizerIndexDataCardExists() {
      await testSubjects.existOrFail('dataVisualizerCardIndexData');
    },

    async assertDataVisualizerStartTrialCardExists() {
      await testSubjects.existOrFail('dataVisualizerCardStartTrial');
    },

    async assertSelectIndexButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('dataVisualizerSelectIndexButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "select index" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertUploadFileButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('dataVisualizerUploadFileButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "upload file" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertStartTrialButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('dataVisualizerStartTrialButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "start trial" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async navigateToIndexPatternSelection() {
      await testSubjects.click('dataVisualizerSelectIndexButton');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async navigateToFileUpload() {
      await testSubjects.click('dataVisualizerUploadFileButton');
      await testSubjects.existOrFail('dataVisualizerPageFileUpload');
    },
  };
}
