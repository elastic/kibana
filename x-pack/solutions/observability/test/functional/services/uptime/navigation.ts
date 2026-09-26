/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeNavigationProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header']);

  const goToUptimeRoot = async () => {
    // Check if are already on overview uptime page, we don't need to repeat the step
    await retry.tryForTime(60 * 1000, async () => {
      if (await testSubjects.exists('uptimeSettingsToOverviewLink', { timeout: 0 })) {
        await testSubjects.click('uptimeSettingsToOverviewLink');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('uptimeOverviewPage', { timeout: 2000 });
      } else {
        await PageObjects.common.navigateToApp('uptime');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('uptimeOverviewPage', { timeout: 2000 });
      }
    });
  };

  return {
    async goToUptime() {
      await goToUptimeRoot();
    },

    goToSettings: async () => {
      await goToUptimeRoot();
      await testSubjects.click('settings-page-link', 5000);
      await testSubjects.existOrFail('uptimeSettingsPage', { timeout: 10000 });
    },

    goToMonitor: async (monitorId: string) => {
      // only go to monitor page if not already there
      if (!(await testSubjects.exists('uptimeMonitorPage', { timeout: 0 }))) {
        return retry.try(async () => {
          await testSubjects.click(`monitor-page-link-${monitorId}`);
        });
      }
    },

    goToCertificates: async () => {
      if (!(await testSubjects.exists('uptimeCertificatesPage', { timeout: 0 }))) {
        return retry.try(async () => {
          if (await find.existsByCssSelector('[href="/app/uptime/certificates"]', 0)) {
            await find.clickByCssSelector('[href="/app/uptime/certificates"]');
          }
          await testSubjects.existOrFail('uptimeCertificatesPage');
        });
      }
      return true;
    },
  };
}
