/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const UptimeProvider = ({ getService }: KibanaFunctionalTestDefaultProviders) => {
  const testSubjects = getService('testSubjects');
  const wait = (seconds: number) => new Promise(r => setTimeout(r, seconds * 1000));
  return {
    async assertExists(key: string) {
      if (!(await testSubjects.exists(key))) {
        throw new Error(`Couldn't find expected element with key "${key}".`);
      }
    },
    async navigateToPlugin() {
      await testSubjects.click('homeSynopsisLinkuptime');
    },
    async monitorIdExists(key: string) {
      await wait(1);
      await testSubjects.existOrFail(key);
    },
    async navigateToMonitorWithId(monitorId: string) {
      await wait(1);
      await testSubjects.click(`monitor-page-link-${monitorId}`);
    },
    async getMonitorNameDisplayedOnPageTitle() {
      await wait(1);
      return await testSubjects.getVisibleText('monitor-page-title');
    },
  };
};
