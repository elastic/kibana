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
      monitorIdToCheck: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteStart(datePickerStartValue);
      await uptimeService.monitorIdExists(monitorIdToCheck);
    }

    public async loadDataAndGoToMonitorPage(
      datePickerStartValue: string,
      monitorId: string,
      monitorName: string
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteStart(datePickerStartValue);
      await uptimeService.navigateToMonitorWithId(monitorId);
      if ((await uptimeService.getMonitorNameDisplayedOnPageTitle()) !== monitorName) {
        throw new Error('Expected monitor name not found');
      }
    }

    public async applyCustomFilterQuery(
      datePickerStartValue: string,
      filterQuery: string,
      expectedMonitorList: string[]
    ) {
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteStart(datePickerStartValue);
      await uptimeService.runFilterBarQuery(filterQuery);
      // sometimes the page takes moment to render the updated monitor list
      await new Promise(resolve => setTimeout(resolve, 1000));
      await Promise.all(
        expectedMonitorList.map(monitorLink => uptimeService.assertExists(monitorLink))
      );
      // TODO: add a check for the snapshot values
    }
  }();
};
