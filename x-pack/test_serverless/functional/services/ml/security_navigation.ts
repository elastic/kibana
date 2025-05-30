/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningNavigationProviderSecurity({
  getService,
  getPageObject,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const retry = getService('retry');

  async function navigateToArea(id: string, expectedTestSubject: string) {
    await svlCommonNavigation.sidenav.openSection(
      'security_solution_nav_footer.category-management'
    );
    await retry.tryForTime(5 * 1000, async () => {
      await svlCommonNavigation.sidenav.clickLink({ navId: 'stack_management' });
      await svlCommonNavigation.sidenav.clickPanelLink(id);
      await testSubjects.existOrFail(expectedTestSubject, { timeout: 2500 });
    });
  }

  return {
    async navigateToAnomalyDetection() {
      await navigateToArea('management:anomaly_detection', 'ml-jobs-list');
    },
    async navigateToDataFrameAnalytics() {
      await navigateToArea('management:analytics', 'mlAnalyticsJobList');
    },
    async navigateToTrainedModels() {
      await navigateToArea('management:trained_models', 'mlTrainedModelsList');
    },
    async navigateToMemoryUsage() {
      await navigateToArea('management:overview', 'mlStackManagementOverviewPage');
      await testSubjects.existOrFail('mlMemoryUsagePanel', { timeout: 2500 });
    },
    async navigateToNotifications() {
      await navigateToArea('management:overview', 'mlStackManagementOverviewPage');
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.click('mlManagementOverviewPageTabs notifications');
        await testSubjects.existOrFail('mlNotificationsTable loaded');
      });
    },
  };
}
