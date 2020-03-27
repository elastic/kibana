/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function UptimePageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker']);
  const { common: commonService, navigation, alerts } = getService('uptime');
  const retry = getService('retry');

  return new (class UptimePage {
    public async goToRoot() {
      await pageObjects.common.navigateToApp('uptime');
    }

    public async goToUptimePageAndSetDateRange(
      datePickerStartValue: string,
      datePickerEndValue: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
    }

    public async goToUptimeOverviewAndLoadData(
      datePickerStartValue: string,
      datePickerEndValue: string,
      monitorIdToCheck?: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
      if (monitorIdToCheck) {
        await commonService.monitorIdExists(monitorIdToCheck);
      }
    }

    public async loadDataAndGoToMonitorPage(
      datePickerStartValue: string,
      datePickerEndValue: string,
      monitorId: string,
      monitorName?: string
    ) {
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
      await navigation.goToMonitor(monitorId, monitorName);
    }

    public async inputFilterQuery(filterQuery: string) {
      await commonService.setFilterText(filterQuery);
    }

    public async pageHasDataMissing() {
      return await commonService.pageHasDataMissing();
    }

    public async pageHasExpectedIds(monitorIdsToCheck: string[]): Promise<void> {
      return retry.tryForTime(15000, async () => {
        await Promise.all(monitorIdsToCheck.map(id => commonService.monitorPageLinkExists(id)));
      });
    }

    public async pageUrlContains(value: string, expected: boolean = true): Promise<void> {
      return retry.tryForTime(12000, async () => {
        expect(await commonService.urlContains(value)).to.eql(expected);
      });
    }

    public async changePage(direction: 'next' | 'prev') {
      if (direction === 'next') {
        await commonService.goToNextPage();
      } else if (direction === 'prev') {
        await commonService.goToPreviousPage();
      }
    }

    public async setStatusFilter(value: 'up' | 'down') {
      if (value === 'up') {
        await commonService.setStatusFilterUp();
      } else if (value === 'down') {
        await commonService.setStatusFilterDown();
      }
    }

    public async selectFilterItems(filters: Record<string, string[]>) {
      for (const key in filters) {
        if (filters.hasOwnProperty(key)) {
          const values = filters[key];
          for (let i = 0; i < values.length; i++) {
            await commonService.selectFilterItem(key, values[i]);
          }
        }
      }
    }

    public async getSnapshotCount() {
      return await commonService.getSnapshotCount();
    }

    public async openAlertFlyoutAndCreateMonitorStatusAlert({
      alertInterval,
      alertName,
      alertNumTimes,
      alertTags,
      alertThrottleInterval,
      alertTimerangeSelection,
      filters,
    }: {
      alertName: string;
      alertTags: string[];
      alertInterval: string;
      alertThrottleInterval: string;
      alertNumTimes: string;
      alertTimerangeSelection: string;
      filters?: string;
    }) {
      const { setKueryBarText } = commonService;
      await alerts.openFlyout();
      await alerts.openMonitorStatusAlertType();
      await alerts.setAlertName(alertName);
      await alerts.setAlertTags(alertTags);
      await alerts.setAlertInterval(alertInterval);
      await alerts.setAlertThrottleInterval(alertThrottleInterval);
      if (filters) {
        await setKueryBarText('xpack.uptime.alerts.monitorStatus.filterBar', filters);
      }
      await alerts.setAlertStatusNumTimes(alertNumTimes);
      await alerts.setAlertTimerangeSelection(alertTimerangeSelection);
      await alerts.setMonitorStatusSelectableToHours();
      await alerts.setLocationsSelectable();
      await alerts.clickSaveAlertButtion();
    }

    public async setMonitorListPageSize(size: number): Promise<void> {
      await commonService.openPageSizeSelectPopover();
      return commonService.clickPageSizeSelectPopoverItem(size);
    }
  })();
}
