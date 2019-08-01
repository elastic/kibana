/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateToMl() {
      return await PageObjects.common.navigateToApp('ml');
    },

    async navigateToJobManagement() {
      await testSubjects.click('mlTabJobManagement');
      await testSubjects.existOrFail('mlPageJobManagement');
    },

    async navigateToAnomalyExplorert() {
      await testSubjects.click('mlTabAnomalyExplorer');
      await testSubjects.existOrFail('mlPageAnomalyExplorer');
    },

    async navigateToSingleMetricViewer() {
      await testSubjects.click('mlTabSingleMetricViewer');
      await testSubjects.existOrFail('mlPageSingleMetricViewer');
    },

    async navigateToDataFrames() {
      await testSubjects.click('mlTabDataFrames');
      await testSubjects.existOrFail('mlPageDataFrame');
    },

    async navigateToDataVisualizer() {
      await testSubjects.click('mlTabDataVisualizer');
      await testSubjects.existOrFail('mlPageDataVisualizerSelector');
    },

    async navigateToSettings() {
      await testSubjects.click('mlTabSettings');
      await testSubjects.existOrFail('mlPageSettings');
    },
  };
}
