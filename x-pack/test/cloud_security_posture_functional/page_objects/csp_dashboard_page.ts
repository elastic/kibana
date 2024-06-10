/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

// Defined in CSP plugin
const LATEST_FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export function CspDashboardPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    remove: () => es.indices.delete({ index: LATEST_FINDINGS_INDEX, ignore_unavailable: true }),
    add: async <T>(findingsMock: T[]) => {
      await Promise.all(
        findingsMock.map((finding) =>
          es.index({
            index: LATEST_FINDINGS_INDEX,
            body: finding,
          })
        )
      );
    },
  };

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

    getAllCloudComplianceScores: async () => {
      await dashboard.getCloudDashboard();
      return await testSubjects.findAll('dashboard-summary-section-compliance-score');
    },

    getCloudComplianceScore: async () => {
      await dashboard.getCloudSummarySection();
      return await testSubjects.find('dashboard-summary-section-compliance-score');
    },

    getCloudResourcesEvaluatedCard: async () => {
      await dashboard.getCloudDashboard();
      return await testSubjects.find('dashboard-counter-card-resources-evaluated');
    },

    getCloudResourcesEvaluated: async () => {
      const resourcesEvaluatedCard = await dashboard.getCloudResourcesEvaluatedCard();
      return await resourcesEvaluatedCard.findByXpath('//div/p/span');
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

    getKubernetesResourcesEvaluatedCard: async () => {
      await dashboard.getKubernetesDashboard();
      return await testSubjects.find('dashboard-counter-card-resources-evaluated');
    },

    getKubernetesResourcesEvaluated: async () => {
      const resourcesEvaluatedCard = await dashboard.getKubernetesResourcesEvaluatedCard();
      return await resourcesEvaluatedCard.findByXpath('//div/p/span');
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
    waitForPluginInitialized,
    navigateToComplianceDashboardPage,
    dashboard,
    index,
  };
}
