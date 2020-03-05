/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function UptimeProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  const settings = {
    go: async () => {
      await testSubjects.click('settings-page-link', 5000);
    },
    changeHeartbeatIndicesInput: async (text: string) => {
      const input = await testSubjects.find('heartbeat-indices-input', 5000);
      await input.clearValueWithKeyboard();
      await input.type(text);
    },
    loadFields: async () => {
      const heartbeatIndices = await (
        await testSubjects.find('heartbeat-indices-input', 5000)
      ).getAttribute('value');
      return { heartbeatIndices };
    },
    applyButtonIsDisabled: async () => {
      return !!(await (await testSubjects.find('apply-settings-button')).getAttribute('disabled'));
    },
    apply: async () => {
      await (await testSubjects.find('apply-settings-button')).click();
    },
  };

  return {
    settings,
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
    async navigateToMonitorWithId(monitorId: string) {
      await testSubjects.click(`monitor-page-link-${monitorId}`, 5000);
    },
    async getMonitorNameDisplayedOnPageTitle() {
      return await testSubjects.getVisibleText('monitor-page-title');
    },
    async pageHasDataMissing() {
      return await testSubjects.find('data-missing', 5000);
    },
    async setFilterText(filterQuery: string) {
      await testSubjects.click('xpack.uptime.filterBar');
      await testSubjects.setValue('xpack.uptime.filterBar', filterQuery);
      await browser.pressKeys(browser.keys.ENTER);
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
    async locationMissingExists() {
      return await testSubjects.existOrFail('xpack.uptime.locationMap.locationMissing', {
        timeout: 3000,
      });
    },
  };
}
