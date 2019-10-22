/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

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

    async assertTabsExist(tabTypeSubject: string, areaSubjects: string[]) {
      await retry.tryForTime(10000, async () => {
        expect(await testSubjects.findAll(`~${tabTypeSubject}`, 3)).to.have.length(
          areaSubjects.length
        );
        for (const areaSubj of areaSubjects) {
          await testSubjects.existOrFail(`~${tabTypeSubject}&~${areaSubj}`, { timeout: 1000 });
        }
      });
    },

    async navigateToArea(linkSubject: string, pageSubject: string) {
      await retry.tryForTime(2 * 60 * 1000, async () => {
        if ((await testSubjects.exists(`${linkSubject} selected`)) === false) {
          await testSubjects.click(linkSubject);
          await testSubjects.existOrFail(`${linkSubject} selected`, { timeout: 30 * 1000 });
          await testSubjects.existOrFail(pageSubject, { timeout: 30 * 1000 });
        }
      });
    },

    async assertMainTabsExist() {
      await this.assertTabsExist('mlMainTab', [
        'anomalyDetection',
        'dataFrames',
        'dataFrameAnalytics',
        'dataVisualizer',
      ]);
    },

    async navigateToOverview() {
      await this.navigateToArea('mlMainTab overview', 'mlPageOverview');
    },

    async navigateToAnomalyDetection() {
      await this.navigateToArea('mlMainTab anomalyDetection', 'mlPageJobManagement');
      await this.assertTabsExist('mlSubTab', [
        'jobManagement',
        'anomalyExplorer',
        'singleMetricViewer',
        'settings',
      ]);
    },

    async navigateToDataFrameAnalytics() {
      await this.navigateToArea('mlMainTab dataFrameAnalytics', 'mlPageDataFrameAnalytics');
      await this.assertTabsExist('mlSubTab', []);
    },

    async navigateToDataVisualizer() {
      await this.navigateToArea('mlMainTab dataVisualizer', 'mlPageDataVisualizerSelector');
      await this.assertTabsExist('mlSubTab', []);
    },

    async navigateToJobManagement() {
      await this.navigateToAnomalyDetection();
      await this.navigateToArea('mlSubTab jobManagement', 'mlPageJobManagement');
    },

    async navigateToAnomalyExplorer() {
      await this.navigateToAnomalyDetection();
      await this.navigateToArea('mlSubTab anomalyExplorer', 'mlPageAnomalyExplorer');
    },

    async navigateToSingleMetricViewer() {
      await this.navigateToAnomalyDetection();
      await this.navigateToArea('mlSubTab singleMetricViewer', 'mlPageSingleMetricViewer');
    },

    async navigateToSettings() {
      await this.navigateToAnomalyDetection();
      await this.navigateToArea('mlSubTab settings', 'mlPageSettings');
    },
  };
}
