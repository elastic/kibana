/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function UptimeProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async assertExists(key: string) {
      if (!(await testSubjects.exists(key))) {
        throw new Error(`Couldn't find expected element with key "${key}".`);
      }
    },
    async monitorIdExists(key: string) {
      await testSubjects.existOrFail(key);
    },
    async monitorPageLinkExists(monitorId: string) {
      await testSubjects.existOrFail(`monitor-page-link-${monitorId}`);
    },
    async urlContains(expected: string) {
      const url = await browser.getCurrentUrl();
      return url.indexOf(expected) >= 0;
    },
    async navigateToMonitorWithId(monitorId: string) {
      await testSubjects.click(`monitor-page-link-${monitorId}`);
    },
    async getMonitorNameDisplayedOnPageTitle() {
      return await testSubjects.getVisibleText('monitor-page-title');
    },
    async setFilterText(filterQuery: string) {
      await testSubjects.click('xpack.uptime.filterBar');
      await testSubjects.setValue('xpack.uptime.filterBar', filterQuery);
      await browser.pressKeys(browser.keys.ENTER);
    },
    async goToNextPage() {
      await testSubjects.click('xpack.uptime.monitorList.nextButton');
    },
    async goToPreviousPage() {
      await testSubjects.click('xpack.uptime.monitorList.prevButton');
    },
    async setStatusFilterUp() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusUp');
    },
    async setStatusFilterDown() {
      await testSubjects.click('xpack.uptime.filterBar.filterStatusDown');
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
  };
}
