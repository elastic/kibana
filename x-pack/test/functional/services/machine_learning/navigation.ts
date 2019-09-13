/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateToMl() {
      return await PageObjects.common.navigateToApp('ml');
    },

    async navigateToArea(linkSubject: string, pageSubject: string) {
      await retry.try(async () => {
        if ((await testSubjects.exists(pageSubject)) === false) {
          await testSubjects.click(linkSubject);
          await testSubjects.existOrFail(pageSubject);
        }
      });
    },

    async navigateToJobManagement() {
      await this.navigateToArea('mlTabJobManagement', 'mlPageJobManagement');
    },

    async navigateToAnomalyExplorert() {
      await this.navigateToArea('mlTabAnomalyExplorer', 'mlPageAnomalyExplorer');
    },

    async navigateToSingleMetricViewer() {
      await this.navigateToArea('mlTabSingleMetricViewer', 'mlPageSingleMetricViewer');
    },

    async navigateToSettings() {
      await this.navigateToArea('mlTabSettings', 'mlPageSettings');
    },

    async navigateToDataFrames() {
      await this.navigateToArea('mlTabDataFrames', 'mlPageDataFrame');
    },

    async navigateToDataVisualizer() {
      await this.navigateToArea('mlTabDataVisualizer', 'mlPageDataVisualizerSelector');
    },
  };
}
