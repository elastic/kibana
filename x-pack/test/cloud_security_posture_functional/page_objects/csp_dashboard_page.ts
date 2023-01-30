/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

// Defined in CSP plugin
const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export function CspDashboardPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    remove: () => es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true }),
    add: async <T>(findingsMock: T[]) => {
      await waitForPluginInitialized();
      await Promise.all(
        findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_INDEX,
            body: finding,
          })
        )
      );
    },
  };

  const dashboard = {
    getDashboardContainer: () => testSubjects.find('dashboard-container'),

    getIntegrationTabs: async () => {
      const dashboardContainer = await dashboard.getDashboardContainer();
      const tabs = await dashboardContainer.findByClassName('euiTabs');
      return tabs;
    },

    getCloudTab: async () => {
      const tabs = await dashboard.getIntegrationTabs();
      const cloudTab = await tabs.findByXpath(`span[text()="Cloud"]`);
      return cloudTab;
    },

    getKubernetesTab: async () => {
      const tabs = await dashboard.getIntegrationTabs();
      const kubernetesTab = await tabs.findByXpath(`span[text()="Kubernetes"]`);
      return kubernetesTab;
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
      await dashboard.getKubernetesSummarySection();
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
    index,
  };
}
