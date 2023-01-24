/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraMetricsExplorerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');

  return {
    async getMetrics() {
      const subject = await testSubjects.find('metricsExplorer-metrics');
      return await subject.findAllByCssSelector('span.euiBadge');
    },

    async removeMetric(value: string) {
      const subject = await testSubjects.find('metricsExplorer-metrics');
      const button = await subject.findByCssSelector(`span.euiBadge[value="${value}"] button`);
      return await button.click();
    },

    async addMetric(value: string) {
      const subject = await testSubjects.find('metricsExplorer-metrics');
      return await comboBox.setElement(subject, value);
    },

    async setGroupBy(value: string) {
      const subject = await testSubjects.find('metricsExplorer-groupBy');
      return await comboBox.setElement(subject, value);
    },

    async getCharts() {
      return await testSubjects.findAll('metricsExplorer-chart');
    },

    async getMissingMetricMessage() {
      return await testSubjects.find('metricsExplorer-missingMetricMessage');
    },

    async getChartType(chart: WebElementWrapper) {
      const figure = await chart.findByCssSelector('figure');
      const descId = await figure.getAttribute('aria-describedby');
      const descElement = await chart.findByCssSelector(`dd[id="${descId}"]`);
      return await descElement.getAttribute('textContent');
    },

    async switchChartType(type: string) {
      const customizeButton = await testSubjects.find('metricsExplorer-customize');
      await customizeButton.click();
      const chartRadio = await testSubjects.find(`metricsExplorer-chartRadio-${type}`);
      const radioInput = await chartRadio.findByCssSelector(`label[for="${type}"]`);
      return await radioInput.click();
    },
  };
}
