/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionalFtrProviderContext } from '../../common/ftr_provider_context';

export function CspDashboardPageProvider({
  getService,
  getPageObjects,
}: FunctionalFtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');

  const dashboard = {
    getDashboardPageHeader: () => testSubjects.find('cloud-posture-dashboard-page-header'),

    getDashboardTabs: async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      const dashboardPageHeader = await dashboard.getDashboardPageHeader();
      return await dashboardPageHeader.findByClassName('euiTabs');
    },

    getCloudTab: async () => {
      const tabs = await dashboard.getDashboardTabs();
      return await tabs.findByXpath(`//span[text()="Cloud"]`);
    },

    getKubernetesTab: async () => {
      const tabs = await dashboard.getDashboardTabs();
      return await tabs.findByXpath(`//span[text()="Kubernetes"]`);
    },

    clickTab: async (tab: 'Cloud' | 'Kubernetes') => {
      if (tab === 'Cloud') {
        const cloudTab = await dashboard.getCloudTab();
        await cloudTab.click();
      }
      if (tab === 'Kubernetes') {
        const k8sTab = await dashboard.getKubernetesTab();
        await k8sTab.click();
      }
    },

    getIntegrationDashboardContainer: () => testSubjects.find('dashboard-container'),

    // Cloud Dashboard

    getCloudDashboard: async () => {
      await dashboard.clickTab('Cloud');
      return await testSubjects.find('cloud-dashboard-container');
    },

    getCloudSummarySection: async () => {
      await dashboard.getCloudDashboard();
      return await testSubjects.find('dashboard-summary-section');
    },

    getCloudComplianceScore: async () => {
      await dashboard.getCloudSummarySection();
      return await testSubjects.find('dashboard-summary-section-compliance-score');
    },

    // Kubernetes Dashboard

    getKubernetesDashboard: async () => {
      await dashboard.clickTab('Kubernetes');
      return await testSubjects.find('kubernetes-dashboard-container');
    },

    getKubernetesSummarySection: async () => {
      await dashboard.getKubernetesDashboard();
      return await testSubjects.find('dashboard-summary-section');
    },

    getKubernetesComplianceScore: async () => {
      await retry.waitFor(
        'Cloud posture dashboard summary section to be displayed',
        async () => !!(await dashboard.getKubernetesSummarySection())
      );

      return await testSubjects.find('dashboard-summary-section-compliance-score');
    },
  };

  const navigateToComplianceDashboardPage = async () => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      'cloud_security_posture/dashboard',
      { shouldUseHashForSubUrl: false }
    );
  };

  return {
    navigateToComplianceDashboardPage,
    dashboard,
  };
}
