/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsResultsProvider({
  getService,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertRegressionEvaluatePanelElementsExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-RegressionEvaluation');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionGenMSEstat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionGenRSquaredStat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionTrainingMSEstat');
      await testSubjects.existOrFail('mlDFAnalyticsRegressionTrainingRSquaredStat');
    },

    async assertRegressionTablePanelExists() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationTablePanel');
    },

    async assertClassificationEvaluatePanelElementsExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-ClassificationEvaluation');
      await testSubjects.existOrFail('mlDFAnalyticsClassificationExplorationConfusionMatrix');
    },

    async assertClassificationTablePanelExists() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationTablePanel');
    },

    async assertOutlierTablePanelExists() {
      await testSubjects.existOrFail('mlDFExpandableSection-results');
    },

    async assertResultsTableExists() {
      await testSubjects.existOrFail('mlExplorationDataGrid loaded', { timeout: 5000 });
    },

    async assertResultsTableTrainingFiltersExist() {
      await testSubjects.existOrFail('mlDFAnalyticsExplorationQueryBarFilterButtons', {
        timeout: 5000,
      });
    },

    async getResultTableRows() {
      return await testSubjects.findAll('mlExplorationDataGrid loaded > dataGridRow');
    },

    async assertResultsTableNotEmpty() {
      const resultTableRows = await this.getResultTableRows();
      expect(resultTableRows.length).to.be.greaterThan(
        0,
        `DFA results table should have at least one row (got '${resultTableRows.length}')`
      );
    },
  };
}
