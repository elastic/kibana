/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const UptimePageProvider = ({
  getPageObjects,
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const pageObjects = getPageObjects(['common', 'timePicker']);
  const uptimeService = getService('uptime');

  return new class UptimePage {
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

    public async inputFilterQuery(
      datePickerStartValue: string,
      datePickerEndValue: string,
      filterQuery: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteRange(datePickerStartValue, datePickerEndValue);
      await uptimeService.setFilterText(filterQuery);
      await uptimeService.monitorIdExists('monitor-page-link-auto-http-0X131221E73F825974');
    }
  }();
};
