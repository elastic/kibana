/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function UptimePageObject({ getService, getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'header', 'timePicker']);
  const retry = getService('retry');
  const uptime = getService('uptime');

  return {
    async goToRoot(refresh?: boolean) {
      await uptime.navigation.goToUptime();
      if (refresh) {
        await uptime.navigation.refreshApp();
      }
    },

    async setDateRange(start: string, end: string) {
      const { start: prevStart, end: prevEnd } = await pageObjects.timePicker.getTimeConfig();
      if (start !== prevStart || prevEnd !== end) {
        await pageObjects.timePicker.setAbsoluteRange(start, end);
      } else {
        await uptime.navigation.refreshApp();
      }
    },

    async goToUptimeOverviewAndLoadData(
      dateStart: string,
      dateEnd: string,
      monitorIdToCheck?: string
    ) {
      await uptime.navigation.goToUptime();
      await this.setDateRange(dateStart, dateEnd);
      if (monitorIdToCheck) {
        await uptime.common.monitorIdExists(monitorIdToCheck);
      }
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    async loadDataAndGoToMonitorPage(dateStart: string, dateEnd: string, monitorId: string) {
      await pageObjects.header.waitUntilLoadingHasFinished();
      await this.setDateRange(dateStart, dateEnd);
      await uptime.navigation.goToMonitor(monitorId);
    },

    async inputFilterQuery(filterQuery: string) {
      await uptime.common.setFilterText(filterQuery);
    },

    async pageHasDataMissing() {
      return await uptime.common.pageHasDataMissing();
    },

    async pageHasExpectedIds(monitorIdsToCheck: string[]): Promise<void> {
      return retry.tryForTime(15000, async () => {
        await Promise.all(monitorIdsToCheck.map((id) => uptime.common.monitorPageLinkExists(id)));
      });
    },

    async pageUrlContains(value: string, expected: boolean = true): Promise<void> {
      return retry.tryForTime(12000, async () => {
        expect(await uptime.common.urlContains(value)).to.eql(expected);
      });
    },

    async changePage(direction: 'next' | 'prev') {
      if (direction === 'next') {
        await uptime.common.goToNextPage();
      } else if (direction === 'prev') {
        await uptime.common.goToPreviousPage();
      }
    },

    async setStatusFilter(value: 'up' | 'down') {
      if (value === 'up') {
        await uptime.common.setStatusFilterUp();
      } else if (value === 'down') {
        await uptime.common.setStatusFilterDown();
      }
    },

    async selectFilterItems(filters: Record<string, string[]>) {
      for (const key in filters) {
        if (Object.hasOwn(filters, key)) {
          const values = filters[key];
          for (let i = 0; i < values.length; i++) {
            await uptime.common.selectFilterItem(key, values[i]);
          }
        }
      }
    },

    async getSnapshotCount() {
      return await uptime.common.getSnapshotCount();
    },

    async setAlertKueryBarText(filters: string) {
      await uptime.common.setKueryBarText(
        'xpack.synthetics.alerts.monitorStatus.filterBar',
        filters
      );
    },

    async setMonitorListPageSize(size: number): Promise<void> {
      await uptime.common.openPageSizeSelectPopover();
      return uptime.common.clickPageSizeSelectPopoverItem(size);
    },

    async checkPingListInteractions(timestamps: string[]): Promise<void> {
      return uptime.monitor.checkForPingListTimestamps(timestamps);
    },

    async resetFilters() {
      await this.inputFilterQuery('');
      await uptime.common.resetStatusFilter();
    },
  };
}
