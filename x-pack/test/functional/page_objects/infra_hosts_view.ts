/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHostsViewProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async clickTryHostViewLink() {
      return await testSubjects.click('inventory-hostsView-link');
    },

    async clickTryHostViewBadge() {
      return await testSubjects.click('inventory-hostsView-badge');
    },

    async getHostsLandingPageDisabled() {
      const container = await testSubjects.find('hostView-no-enable-access');
      const containerText = await container.getVisibleText();
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

    async getMetricsTrendTilesCount() {
      const container = await this.getMetricsTrendContainer();
      return container.findAllByCssSelector('[data-test-subj*="hostsView-metricsTrend-"]');
    },

    async getMetricsTrendTileValue(type: string) {
      const container = await this.getMetricsTrendContainer();
      const element = await container.findByTestSubject(`hostsView-metricsTrend-${type}`);
      const div = await element.findByClassName('echMetricText__value');
      return await div.getAttribute('title');
    },
  };
}
