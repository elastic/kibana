/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeNavigationProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'timePicker', 'header']);

  const goToUptimeRoot = async () => {
    // Check if are already on overview uptime page, we don't need to repeat the step
    await retry.tryForTime(60 * 1000, async () => {
      if (await testSubjects.exists('uptimeSettingsToOverviewLink', { timeout: 0 })) {
        await testSubjects.click('uptimeSettingsToOverviewLink');
        await testSubjects.existOrFail('uptimeOverviewPage', { timeout: 2000 });
      } else if (!(await testSubjects.exists('uptimeOverviewPage', { timeout: 0 }))) {
        await PageObjects.common.navigateToApp('uptime');
        await PageObjects.header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('uptimeOverviewPage', { timeout: 2000 });
      }
    });
  };

  const refreshApp = async () => {
    await testSubjects.click('superDatePickerApplyTimeButton', 10000);
  };

  return {
    async refreshApp() {
      await refreshApp();
    },

    async goToUptime() {
      await goToUptimeRoot();
    },

    goToSettings: async () => {
      await goToUptimeRoot();
      await testSubjects.click('settings-page-link', 5000);
      await testSubjects.existOrFail('uptimeSettingsPage', { timeout: 2000 });
    },

    checkIfOnMonitorPage: async (monitorId: string) => {
      const monitorPage = await testSubjects.exists('uptimeMonitorPage', { timeout: 1000 });
      if (monitorId && monitorPage) {
        const thisMonitorPage =
          (await testSubjects.getVisibleText('monitor-page-title')) === monitorId;
        return monitorPage && thisMonitorPage;
      } else {
        return monitorPage;
      }
    },

    goToMonitor: async (monitorId: string) => {
      // only go to monitor page if not already there
      if (!(await testSubjects.exists('uptimeMonitorPage', { timeout: 0 }))) {
        await testSubjects.click(`monitor-page-link-${monitorId}`);
        await testSubjects.existOrFail('uptimeMonitorPage', {
          timeout: 30000,
        });
      }
    },

    goToCertificates: async () => {
      if (!(await testSubjects.exists('uptimeCertificatesPage', { timeout: 0 }))) {
        return retry.try(async () => {
          if (await testSubjects.exists('uptimeCertificatesLink', { timeout: 0 })) {
            await testSubjects.click('uptimeCertificatesLink', 10000);
          }
          await testSubjects.existOrFail('uptimeCertificatesPage');
        });
      }
      return true;
    },

    async loadDataAndGoToMonitorPage(dateStart: string, dateEnd: string, monitorId: string) {
      await PageObjects.timePicker.setAbsoluteRange(dateStart, dateEnd);
      await this.goToMonitor(monitorId);
    },

    async isOnDetailsPage() {
      return await testSubjects.exists('uptimeMonitorPage', { timeout: 0 });
    },

    async goToHomeViaBreadCrumb() {
      await testSubjects.click('breadcrumb first');
    },
  };
}
