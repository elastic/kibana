/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHostsViewProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async clickTryHostViewLink() {
      return await testSubjects.click('inventory-hostsView-link');
    },

    async clickTryHostViewBadge() {
      return await testSubjects.click('inventory-hostsView-link-badge');
    },

    async getHostsLandingPageDisabled() {
      const container = await testSubjects.find('hostView-no-enable-access');
      const containerText = await container.getVisibleText();
      return containerText;
    },

    async getHostsLandingPageDocsLink() {
      const container = await testSubjects.find('hostsView-docs-link');
      const containerText = await container.getAttribute('href');
      return containerText;
    },

    async getHostsLandingPageEnableButton() {
      const container = await testSubjects.find('hostsView-enable-feature-button');
      return container;
    },

    async clickEnableHostViewButton() {
      return await testSubjects.click('hostsView-enable-feature-button');
    },

    async getHostsTableData() {
      const table = await testSubjects.find('hostsView-table');
      return table.findAllByTestSubject('hostsView-tableRow');
    },

    async getMetricsTrendContainer() {
      return testSubjects.find('hostsView-metricsTrend');
    },

    async getChartsContainer() {
      return testSubjects.find('hostsView-metricChart');
    },

    async getAllMetricsTrendTiles() {
      const container = await this.getMetricsTrendContainer();
      return container.findAllByCssSelector('[data-test-subj*="hostsView-metricsTrend-"]');
    },

    async getMetricsTrendTileValue(type: string) {
      const container = await this.getMetricsTrendContainer();
      const element = await container.findByTestSubject(`hostsView-metricsTrend-${type}`);
      const div = await element.findByClassName('echMetricText__value');
      return await div.getAttribute('title');
    },

    async getAllMetricsCharts() {
      const container = await this.getChartsContainer();
      return container.findAllByCssSelector('[data-test-subj*="hostsView-metricChart-"]');
    },

    async getOpenInLensOption() {
      const metricCharts = await this.getAllMetricsCharts();
      const chart = metricCharts[0];
      await chart.moveMouseTo();
      const button = await testSubjects.findDescendant('embeddablePanelToggleMenuIcon', chart);
      await button.click();
      await testSubjects.existOrFail('embeddablePanelContextMenuOpen');
      return testSubjects.existOrFail('embeddablePanelAction-openInLens');
    },

    // Alerts Tab
    getAlertsTab() {
      return testSubjects.find('hostsView-tabs-alerts');
    },

    getAlertsTabCountBadge() {
      return testSubjects.find('hostsView-tabs-alerts-count');
    },

    async visitAlertTab() {
      const alertsTab = await this.getAlertsTab();
      alertsTab.click();
    },

    setAlertStatusFilter(alertStatus?: AlertStatus) {
      const buttons = {
        [ALERT_STATUS_ACTIVE]: 'hostsView-alert-status-filter-active-button',
        [ALERT_STATUS_RECOVERED]: 'hostsView-alert-status-filter-recovered-button',
        all: 'hostsView-alert-status-filter-show-all-button',
      };

      const buttonSubject = alertStatus ? buttons[alertStatus] : buttons.all;

      return testSubjects.click(buttonSubject);
    },
  };
}
