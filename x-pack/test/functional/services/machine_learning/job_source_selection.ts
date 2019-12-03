/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobSourceSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertSourceListContainsEntry(sourceName: string) {
      await testSubjects.existOrFail(`savedObjectTitle${sourceName}`);
    },

    async filterSourceSelection(sourceName: string) {
      await testSubjects.setValue('savedObjectFinderSearchInput', sourceName, {
        clearWithKeyboard: true,
      });
      await this.assertSourceListContainsEntry(sourceName);
    },

    async selectSource(sourceName: string) {
      await this.filterSourceSelection(sourceName);
      await testSubjects.clickWhenNotDisabled(`savedObjectTitle${sourceName}`);
      await testSubjects.existOrFail('mlPageJobTypeSelection');
    },

    async selectSourceForIndexBasedDataVisualizer(sourceName: string) {
      await this.filterSourceSelection(sourceName);
      await testSubjects.clickWhenNotDisabled(`savedObjectTitle${sourceName}`);
      await testSubjects.existOrFail('mlPageIndexDataVisualizer', { timeout: 10 * 1000 });
    },
  };
}
