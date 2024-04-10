/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringHash } from '@kbn/ml-string-hash';
import { AlertStatus } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../ftr_provider_context';

export function AssetDetailsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async clickApmServicesLink() {
      return testSubjects.click('infraAssetDetailsViewAPMServicesButton');
    },

    async clickOpenAsPageLink() {
      return testSubjects.click('infraAssetDetailsOpenAsPageButton');
    },

    async hostMetricsChartsGroupExists(metric: string) {
      return testSubjects.existOrFail(`infraAssetDetailsHostChartsSection${metric}`);
    },

    async getAssetDetailsKubernetesMetricsCharts() {
      const container = await testSubjects.find('infraAssetDetailsKubernetesChartsSection');
      return container.findAllByCssSelector('[data-test-subj*="infraAssetDetailsMetricChart"]');
    },

    // Overview
    async clickOverviewTab() {
      return testSubjects.click('infraAssetDetailsOverviewTab');
    },

    async getAssetDetailsKPITileValue(type: string) {
      const element = await testSubjects.find(`infraAssetDetailsKPI${type}`);
      const div = await element.findByClassName('echMetricText__value');
      return div.getAttribute('title');
    },

    async overviewAlertsTitleExists() {
      return testSubjects.existOrFail('infraAssetDetailsAlertsTitle');
    },

    async getAssetDetailsServicesWithIconsAndNames() {
      await testSubjects.existOrFail('infraAssetDetailsServicesContainer');
      const container = await testSubjects.find('infraAssetDetailsServicesContainer');
      const serviceLinks = await container.findAllByCssSelector('[data-test-subj="serviceLink"]');

      const servicesWithIconsAndNames = await Promise.all(
        serviceLinks.map(async (link, index) => {
          const icon = await link.findByTagName('img');
          const iconSrc = await icon.getAttribute('src');
          await testSubjects.existOrFail(`serviceNameText-service-${index}`);
          const serviceElement = await link.findByCssSelector(
            `[data-test-subj="serviceNameText-service-${index}"]`
          );
          const serviceName = await serviceElement.getVisibleText();
          const serviceUrl = await link.getAttribute('href');

          return {
            serviceName,
            serviceUrl,
            iconSrc,
          };
        })
      );

      return servicesWithIconsAndNames;
    },

    async clickOverviewLinkToAlerts() {
      return testSubjects.click('infraAssetDetailsAlertsShowAllButton');
    },

    async clickOverviewOpenAlertsFlyout() {
      return testSubjects.click('infraAssetDetailsCreateAlertsRuleButton');
    },

    async clickShowAllMetadataOverviewTab() {
      return testSubjects.click('infraAssetDetailsMetadataShowAllButton');
    },

    async cpuProfilingPromptExists() {
      return testSubjects.existOrFail('infraAssetDetailsCPUProfilingPrompt');
    },

    async cpuProfilingPromptMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsCPUProfilingPrompt');
    },

    async profilingTabExists() {
      return testSubjects.existOrFail('infraAssetDetailsProfilingTab');
    },

    async profilingTabMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsProfilingTab');
    },

    async getAssetDetailsOverviewTabMetricsCharts() {
      const container = await testSubjects.find('infraAssetDetailsOverviewTabContent');
      return container.findAllByCssSelector('[data-test-subj*="infraAssetDetailsMetricChart"]');
    },

    // Collapsable sections
    async metadataSectionCollapsibleExist() {
      return testSubjects.existOrFail('infraAssetDetailsMetadataCollapsible');
    },
    async alertsSectionCollapsibleExist() {
      return testSubjects.existOrFail('infraAssetDetailsAlertsCollapsible');
    },
    async servicesSectionCollapsibleExist() {
      return testSubjects.existOrFail('infraAssetDetailsServicesCollapsible');
    },
    async metricsSectionCollapsibleExist() {
      return testSubjects.existOrFail('infraAssetDetailsMetricsCollapsible');
    },

    async alertsSectionCollapsibleClick() {
      return testSubjects.click('infraAssetDetailsAlertsCollapsible');
    },

    async alertsSectionClosedContentExist() {
      return testSubjects.existOrFail('infraAssetDetailsAlertsClosedContentWithAlerts');
    },
    async alertsSectionClosedContentMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsAlertsClosedContentWithAlerts');
    },

    async alertsSectionClosedContentNoAlertsExist() {
      return testSubjects.existOrFail('infraAssetDetailsAlertsClosedContentNoAlerts');
    },
    async alertsSectionClosedContentNoAlertsMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsAlertsClosedContentNoAlerts');
    },

    // Metadata
    async clickMetadataTab() {
      return testSubjects.click('infraAssetDetailsMetadataTab');
    },

    async clickAddMetadataPin() {
      return testSubjects.click('infraAssetDetailsMetadataAddPin');
    },

    async clickRemoveMetadataPin() {
      return testSubjects.click('infraAssetDetailsMetadataRemovePin');
    },

    async clickAddMetadataFilter() {
      return testSubjects.click('infraAssetDetailsMetadataAddFilterButton');
    },

    async clickRemoveMetadataFilter() {
      return testSubjects.click('infraAssetDetailsMetadataRemoveFilterButton');
    },

    async metadataTableExists() {
      return testSubjects.existOrFail('infraAssetDetailsMetadataTable');
    },

    async metadataTableMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsMetadataTable');
    },

    async metadataRemovePinExists() {
      return testSubjects.exists('infraAssetDetailsMetadataRemovePin');
    },

    async getMetadataAppliedFilter() {
      const filter = await testSubjects.find(
        `filter-badge-${stringHash(
          'host.architecture: arm64'
        )} filter filter-enabled filter-key-host.architecture filter-value-arm64 filter-unpinned filter-id-0`
      );
      return filter.getVisibleText();
    },

    async metadataRemoveFilterExists() {
      return testSubjects.exists('infraAssetDetailsMetadataRemoveFilterButton');
    },

    async getMetadataSearchField() {
      return testSubjects.find('infraAssetDetailsMetadataSearchBarInput');
    },

    // Metrics
    async clickMetricsTab() {
      return testSubjects.click('infraAssetDetailsMetricsTab');
    },

    async getAssetDetailsMetricsTabCharts() {
      const container = await testSubjects.find('infraAssetDetailsMetricsTabContent');
      return container.findAllByCssSelector('[data-test-subj*="infraAssetDetailsMetricChart"]');
    },

    async quickAccessItemExists(metric: string) {
      return testSubjects.click(`infraMetricsQuickAccessItem${metric}`);
    },

    async metricsChartsContentExists() {
      return testSubjects.existOrFail('infraAssetDetailsMetricChartsContent');
    },

    // Processes
    async clickProcessesTab() {
      return testSubjects.click('infraAssetDetailsProcessesTab');
    },

    async getProcessesTabContentTitle(index: number) {
      const processesListElements = await testSubjects.findAll(
        'infraAssetDetailsProcessesSummaryTableItem'
      );
      return processesListElements[index].findByCssSelector('dt');
    },

    async getProcessesTabContentTotalValue() {
      const processesListElements = await testSubjects.findAll(
        'infraAssetDetailsProcessesSummaryTableItem'
      );
      return processesListElements[0].findByCssSelector('dd');
    },

    async processesTableExists() {
      return testSubjects.existOrFail('infraAssetDetailsProcessesTable');
    },

    async getProcessesTableBody() {
      const processesTable = await testSubjects.find('infraAssetDetailsProcessesTable');
      return processesTable.findByCssSelector('tbody');
    },

    async clickProcessesTableExpandButton() {
      return testSubjects.click('infraProcessRowButton');
    },

    async getProcessesSearchField() {
      return testSubjects.find('infraAssetDetailsProcessesSearchBarInput');
    },

    async processesSearchInputErrorMissing() {
      return testSubjects.missingOrFail('infraAssetDetailsProcessesSearchInputError');
    },

    async processesSearchInputErrorExists() {
      return testSubjects.existOrFail('infraAssetDetailsProcessesSearchInputError');
    },

    // Logs
    async clickLogsTab() {
      return testSubjects.click('infraAssetDetailsLogsTab');
    },

    async logsExists() {
      testSubjects.existOrFail('infraAssetDetailsLogsTabContent');
    },

    async getLogsSearchField() {
      return testSubjects.find('infraAssetDetailsLogsTabFieldSearch');
    },

    // Anomalies
    async clickAnomaliesTab() {
      return testSubjects.click('infraAssetDetailsAnomaliesTab');
    },

    // Osquery
    async clickOsqueryTab() {
      return testSubjects.click('infraAssetDetailsOsqueryTab');
    },

    // APM Tab link
    async clickApmTabLink() {
      return testSubjects.click('infraAssetDetailsApmServicesLinkTab');
    },

    setAlertStatusFilter(alertStatus?: AlertStatus) {
      const buttons: Record<AlertStatus | 'all', string> = {
        active: 'hostsView-alert-status-filter-active-button',
        recovered: 'hostsView-alert-status-filter-recovered-button',
        untracked: 'hostsView-alert-status-filter-untracked-button',
        all: 'hostsView-alert-status-filter-show-all-button',
      };

      const buttonSubject = alertStatus ? buttons[alertStatus] : buttons.all;

      return testSubjects.click(buttonSubject);
    },
  };
}
