/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrService } from '../ftr_provider_context';

export class UptimePageObject extends FtrService {
  private readonly timePicker = this.ctx.getPageObject('timePicker');
  private readonly header = this.ctx.getPageObject('header');

  private readonly commonService = this.ctx.getService('uptime').common;
  private readonly monitor = this.ctx.getService('uptime').monitor;
  private readonly navigation = this.ctx.getService('uptime').navigation;
  private readonly retry = this.ctx.getService('retry');

  public async goToRoot(refresh?: boolean) {
    await this.navigation.goToUptime();
    if (refresh) {
      await this.navigation.refreshApp();
    }
  }

  public async setDateRange(start: string, end: string) {
    const { start: prevStart, end: prevEnd } = await this.timePicker.getTimeConfig();
    if (start !== prevStart || prevEnd !== end) {
      await this.timePicker.setAbsoluteRange(start, end);
    } else {
      await this.navigation.refreshApp();
    }
  }

  public async goToUptimeOverviewAndLoadData(
    dateStart: string,
    dateEnd: string,
    monitorIdToCheck?: string
  ) {
    await this.navigation.goToUptime();
    await this.setDateRange(dateStart, dateEnd);
    if (monitorIdToCheck) {
      await this.commonService.monitorIdExists(monitorIdToCheck);
    }
    await this.header.waitUntilLoadingHasFinished();
  }

  public async loadDataAndGoToMonitorPage(dateStart: string, dateEnd: string, monitorId: string) {
    await this.header.waitUntilLoadingHasFinished();
    await this.setDateRange(dateStart, dateEnd);
    await this.navigation.goToMonitor(monitorId);
  }

  public async inputFilterQuery(filterQuery: string) {
    await this.commonService.setFilterText(filterQuery);
  }

  public async pageHasDataMissing() {
    return await this.commonService.pageHasDataMissing();
  }

  public async pageHasExpectedIds(monitorIdsToCheck: string[]): Promise<void> {
    return this.retry.tryForTime(15000, async () => {
      await Promise.all(
        monitorIdsToCheck.map((id) => this.commonService.monitorPageLinkExists(id))
      );
    });
  }

  public async pageUrlContains(value: string, expected: boolean = true): Promise<void> {
    return this.retry.tryForTime(12000, async () => {
      expect(await this.commonService.urlContains(value)).to.eql(expected);
    });
  }

  public async changePage(direction: 'next' | 'prev') {
    if (direction === 'next') {
      await this.commonService.goToNextPage();
    } else if (direction === 'prev') {
      await this.commonService.goToPreviousPage();
    }
  }

  public async setStatusFilter(value: 'up' | 'down') {
    if (value === 'up') {
      await this.commonService.setStatusFilterUp();
    } else if (value === 'down') {
      await this.commonService.setStatusFilterDown();
    }
  }

  public async selectFilterItems(filters: Record<string, string[]>) {
    for (const key in filters) {
      if (Object.hasOwn(filters, key)) {
        const values = filters[key];
        for (let i = 0; i < values.length; i++) {
          await this.commonService.selectFilterItem(key, values[i]);
        }
      }
    }
  }

  public async getSnapshotCount() {
    return await this.commonService.getSnapshotCount();
  }

  public async setAlertKueryBarText(filters: string) {
    const { setKueryBarText } = this.commonService;
    await setKueryBarText('xpack.synthetics.alerts.monitorStatus.filterBar', filters);
  }

  public async setMonitorListPageSize(size: number): Promise<void> {
    await this.commonService.openPageSizeSelectPopover();
    return this.commonService.clickPageSizeSelectPopoverItem(size);
  }

  public async checkPingListInteractions(timestamps: string[]): Promise<void> {
    return this.monitor.checkForPingListTimestamps(timestamps);
  }

  public async resetFilters() {
    await this.inputFilterQuery('');
    await this.commonService.resetStatusFilter();
  }
}
