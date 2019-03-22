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

    public async applyCustomFilterQuery(datePickerStartValue: string, filterQuery: string) {
      const expectedFilteredMonitors = [
        'monitor-page-link-auto-http-0X970CBD2F2102BFA8',
        'monitor-page-link-auto-http-0X9CB71300ABD5A2A8',
        'monitor-page-link-auto-http-0XC9CDA429418EDC2B',
        'monitor-page-link-auto-http-0XD9AE729FC1C1E04A',
        'monitor-page-link-auto-http-0XDD2D4E60FD4A61C3',
      ];
      await pageObjects.common.navigateToApp('uptime');
      await pageObjects.timePicker.setAbsoluteStart(datePickerStartValue);
      await uptimeService.runFilterBarQuery(filterQuery);
      await Promise.all(
        expectedFilteredMonitors.map(monitorLink => uptimeService.assertExists(monitorLink))
      );
      // TODO: add a check for the snapshot values
    }
  }();
};
