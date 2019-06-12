/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const UptimeProvider = ({ getService }: KibanaFunctionalTestDefaultProviders) => {
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
  };
};
