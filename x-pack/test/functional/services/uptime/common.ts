/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeCommonProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');
  const find = getService('find');

  const { header } = getPageObjects(['header']);

  return {
    async assertExists(key: string) {
      if (!(await testSubjects.exists(key))) {
        throw new Error(`Couldn't find expected element with key "${key}".`);
      }
    },
    async monitorIdExists(key: string) {
      await retry.tryForTime(10000, async () => {
        await testSubjects.existOrFail(key);
      });
    },
    async monitorPageLinkExists(monitorId: string) {
      await testSubjects.existOrFail(`monitor-page-link-${monitorId}`);
    },
    async urlContains(expected: string) {
      const url = await browser.getCurrentUrl();
      return url.indexOf(expected) >= 0;
    },
    async pageHasDataMissing() {
      return await testSubjects.find('data-missing', 5000);
    },
    async setKueryBarText(attribute: string, value: string) {
      await testSubjects.click(attribute);
      await testSubjects.setValue(attribute, value);
      await browser.pressKeys(browser.keys.ENTER);
    },
    async setFilterText(filterQuery: string) {
      await this.setKueryBarText('xpack.uptime.filterBar', filterQuery);
    },
    async goToNextPage() {
      await testSubjects.click('xpack.uptime.monitorList.nextButton', 5000);
    },
    async goToPreviousPage() {
      await testSubjects.click('xpack.uptime.monitorList.prevButton', 5000);
    },
    async setStatusFilterUp() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusUp');
    },
    async setStatusFilterDown() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusDown');
    },
    async resetStatusFilter() {
      const upFilter = await find.byCssSelector(
        '[data-test-subj="xpack.uptime.filterBar.filterStatusUp"]'
      );
      if (await upFilter.elementHasClass('euiFilterButton-hasActiveFilters')) {
        await this.setStatusFilterUp();
      }
      const downFilter = await find.byCssSelector(
        '[data-test-subj="xpack.uptime.filterBar.filterStatusDown"]'
      );
      if (await downFilter.elementHasClass('euiFilterButton-hasActiveFilters')) {
        await this.setStatusFilterDown();
      }
    },
    async selectFilterItem(filterType: string, option: string) {
      const popoverId = `filter-popover_${filterType}`;
      const optionId = `filter-popover-item_${option}`;
      await testSubjects.existOrFail(popoverId);
      await testSubjects.click(popoverId);
      await testSubjects.existOrFail(optionId);
      await testSubjects.click(optionId);
      await testSubjects.click(popoverId);
    },
    async getSnapshotCount() {
      return {
        up: await testSubjects.getVisibleText('xpack.uptime.snapshot.donutChart.up'),
        down: await testSubjects.getVisibleText('xpack.uptime.snapshot.donutChart.down'),
      };
    },
    async openPageSizeSelectPopover(): Promise<void> {
      return testSubjects.click('xpack.uptime.monitorList.pageSizeSelect.popoverOpen', 5000);
    },
    async clickPageSizeSelectPopoverItem(size: number = 10): Promise<void> {
      return testSubjects.click(
        `xpack.uptime.monitorList.pageSizeSelect.sizeSelectItem${size.toString()}`,
        5000
      );
    },
    async waitUntilDataIsLoaded() {
      await header.waitUntilLoadingHasFinished();
      return retry.tryForTime(60 * 1000, async () => {
        if (await testSubjects.exists('data-missing')) {
          await testSubjects.click('superDatePickerApplyTimeButton');
          await header.waitUntilLoadingHasFinished();
        }
        await testSubjects.missingOrFail('data-missing');
      });
    },
  };
}
