/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlDataUsagePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertDataUsagePageExists(): Promise<boolean> {
      return await testSubjects.exists('data-usage-page');
    },
    async clickDatastreamsDropdown() {
      await testSubjects.click('data-usage-metrics-filter-dataStreams-popoverButton');
    },
    async findDatastreamsDropdownOptions() {
      return await testSubjects.findAll('dataStreams-filter-option');
    },
    async findDatastreamsDropdownFilterButton() {
      return await testSubjects.find('data-usage-metrics-filter-dataStreams-popoverButton');
    },
    async findIngestRateChart() {
      return await testSubjects.find('ingest_rate-chart');
    },
    async storageRetainedChart() {
      return await testSubjects.find('storage_retained-chart');
    },
    async findLegendItemsInChart(chartElement: WebElementWrapper) {
      return await chartElement.findAllByCssSelector('li.echLegendItem');
    },
    async findLegendActionButton(legendItemElement: WebElementWrapper) {
      return legendItemElement.findByTestSubject('legendActionButton');
    },
    async clickLegendActionButtonAtIndex(chartElement: WebElementWrapper, index: number) {
      const legendItems = await this.findLegendItemsInChart(chartElement);
      if (index < 0 || index >= legendItems.length) {
        throw new Error(
          `Invalid legend item index: ${index}. There are only ${legendItems.length} legend items.`
        );
      }
      const legendItem = legendItems[index];
      const actionButton = await this.findLegendActionButton(legendItem);
      await actionButton.click();
    },

    async assertLegendActionPopoverExists() {
      await testSubjects.existOrFail('legendActionPopover');
    },
  };
}
