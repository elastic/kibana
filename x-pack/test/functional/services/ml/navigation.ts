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
      await testSubjects.exists('mlPageJobManagement');
    },

    async navigateToAnomalyExplorert() {
      await testSubjects.click('mlTabAnomalyExplorer');
      await testSubjects.exists('mlPageAnomalyExplorer');
    },

    async navigateToSingleMetricViewer() {
      await testSubjects.click('mlTabSingleMetricViewer');
      await testSubjects.exists('mlPageSingleMetricViewer');
    },

    async navigateToDataFrames() {
      await testSubjects.click('mlTabDataFrames');
      await testSubjects.exists('mlPageDataFrame');
    },

    async navigateToDataVisualizer() {
      await testSubjects.click('mlTabDataVisualizer');
      await testSubjects.exists('mlPageDataVisualizerSelector');
    },

    async navigateToSettings() {
      await testSubjects.click('mlTabSettings');
      await testSubjects.exists('mlPageSettings');
    },
  };
}
