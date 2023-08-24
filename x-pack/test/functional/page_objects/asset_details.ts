/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

    // Overview
    async clickOverviewTab() {
      return testSubjects.click('infraAssetDetailsOverviewTab');
    },

    async getAssetDetailsKPITileValue(type: string) {
      const container = await testSubjects.find('infraAssetDetailsKPIGrid');
      const element = await container.findByTestSubject(`infraAssetDetailsKPI${type}`);
      const div = await element.findByClassName('echMetricText__value');
      return div.getAttribute('title');
    },

    async overviewAlertsTitleExists() {
      return testSubjects.existOrFail('infraAssetDetailsAlertsTitle');
    },

    async getAssetDetailsMetricsCharts() {
      const container = await testSubjects.find('infraAssetDetailsMetricsChartGrid');
      return container.findAllByCssSelector('[data-test-subj*="infraAssetDetailsMetricsChart"]');
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

    async metadataRemovePinExists() {
      return testSubjects.exists('infraAssetDetailsMetadataRemovePin');
    },

    async getMetadataAppliedFilter() {
      const filter = await testSubjects.find(
        "filter-badge-'host.architecture: arm64' filter filter-enabled filter-key-host.architecture filter-value-arm64 filter-unpinned filter-id-0"
      );
      return filter.getVisibleText();
    },

    async metadataRemoveFilterExists() {
      return testSubjects.exists('infraAssetDetailsMetadataRemoveFilterButton');
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

    // Logs
    async clickLogsTab() {
      return testSubjects.click('infraAssetDetailsLogsTab');
    },

    async logsExists() {
      await testSubjects.existOrFail('infraAssetDetailsLogsTabContent');
    },

    // Anomalies
    async clickAnomaliesTab() {
      return testSubjects.click('infraAssetDetailsAnomaliesTab');
    },

    // Osquery
    async clickOsqueryTab() {
      return testSubjects.click('infraAssetDetailsOsqueryTab');
    },
  };
}
