/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function UptimePageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'timePicker']);
  const uptimeService = getService('uptime');

  return new (class UptimePage {
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
      monitorIdToCheck: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
      await uptimeService.monitorIdExists(monitorIdToCheck);
    }

    public async loadDataAndGoToMonitorPage(
      datePickerStartValue: string,
      datePickerEndValue: string,
      monitorId: string,
      monitorName: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
      await uptimeService.navigateToMonitorWithId(monitorId);
      if ((await uptimeService.getMonitorNameDisplayedOnPageTitle()) !== monitorName) {
        throw new Error('Expected monitor name not found');
      }
    }

    public async inputFilterQuery(filterQuery: string) {
      await uptimeService.setFilterText(filterQuery);
    }

    public async pageHasExpectedIds(monitorIdsToCheck: string[]) {
      await Promise.all(monitorIdsToCheck.map(id => uptimeService.monitorPageLinkExists(id)));
    }

    public async pageUrlContains(value: string) {
      return await uptimeService.urlContains(value);
    }

    public async changePage(direction: 'next' | 'prev') {
      if (direction === 'next') {
        await uptimeService.goToNextPage();
      } else if (direction === 'prev') {
        await uptimeService.goToPreviousPage();
      }
    }

    public async setStatusFilter(value: 'up' | 'down') {
      if (value === 'up') {
        await uptimeService.setStatusFilterUp();
      } else if (value === 'down') {
        await uptimeService.setStatusFilterDown();
      }
    }

    public async selectFilterItems(filters: Record<string, string[]>) {
      for (const key in filters) {
        if (filters.hasOwnProperty(key)) {
          const values = filters[key];
          for (let i = 0; i < values.length; i++) {
            await uptimeService.selectFilterItem(key, values[i]);
          }
        }
      }
    }
  })();
}
