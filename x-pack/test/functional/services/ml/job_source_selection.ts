/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobSourceSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertSourceListContainsEntry(sourceName: string) {
      await testSubjects.existOrFail(`savedObjectTitle${sourceName}`);
    },

    async filterSourceSelection(sourceName: string, dataTestSubjPostFix?: string) {
      await testSubjects.setValue('savedObjectFinderSearchInput', sourceName, {
        clearWithKeyboard: true,
      });
      await this.assertSourceListContainsEntry(dataTestSubjPostFix ?? sourceName);
    },

    async selectSource(sourceName: string, nextPageSubj: string, dataTestSubjPostFix?: string) {
      await this.filterSourceSelection(sourceName, dataTestSubjPostFix);
      await retry.tryForTime(30 * 1000, async () => {
        const dataTestSubj = `savedObjectTitle${dataTestSubjPostFix ?? sourceName}`;
        await testSubjects.clickWhenNotDisabledWithoutRetry(dataTestSubj);
        await testSubjects.existOrFail(nextPageSubj, { timeout: 10 * 1000 });
      });
    },

    async selectSourceForAnomalyDetectionJob(sourceName: string) {
      await this.selectSource(sourceName, 'mlPageJobTypeSelection');
    },

    async selectSourceForAnalyticsJob(sourceName: string) {
      await this.selectSource(sourceName, 'mlAnalyticsCreationContainer');
    },

    async selectSourceForDataDrift(sourceName: string) {
      await this.selectSource(sourceName, 'mlPageDataDrift');
    },

    async selectSourceForIndexBasedDataVisualizer(sourceName: string) {
      await this.selectSource(sourceName, 'dataVisualizerIndexPage');
    },

    async selectSourceForLogRateAnalysis(sourceName: string, dataTestSubjPostFix?: string) {
      await this.selectSource(sourceName, 'aiopsLogRateAnalysisPage', dataTestSubjPostFix);
    },

    async selectSourceForChangePointDetection(sourceName: string) {
      await this.selectSource(sourceName, 'aiopsChangePointDetectionPage');
    },

    async selectSourceForLogPatternAnalysisDetection(sourceName: string) {
      await this.selectSource(sourceName, 'aiopsLogPatternAnalysisPage');
    },
  };
}
