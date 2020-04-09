/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
