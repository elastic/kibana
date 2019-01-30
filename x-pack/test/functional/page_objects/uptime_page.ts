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
  const pageObject = getPageObjects(['common']);
  const uptimeService = getService('uptime');

  return {
    async goToUptimeOverviewAndLoadData(datePickerStartValue: string, monitorIdToCheck: string) {
      await pageObject.common.navigateToApp('home');
      await uptimeService.navigateToPlugin();
      await uptimeService.setStartOfDatePickerRange(datePickerStartValue);
      await uptimeService.monitorIdExists(monitorIdToCheck);
    },
    async loadDataAndGoToMonitorPage(
      datePickerStartValue: string,
      monitorId: string,
      monitorName: string
    ) {
      await pageObject.common.navigateToApp('home');
      await uptimeService.navigateToPlugin();
      if (!(await uptimeService.dateRangeIsAlreadySet())) {
        await uptimeService.setStartOfDatePickerRange(datePickerStartValue);
      }
      await uptimeService.navigateToMonitorWithId(monitorId);
      if ((await uptimeService.getMonitorNameDisplayedOnPageTitle()) !== monitorName) {
        throw new Error('Expected monitor name not found');
      }
    },
  };
};
