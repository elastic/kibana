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
    await testSubjects.click('superDatePickerApplyTimeButton');
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
      if (!(await testSubjects.exists('uptimeMonitorPage', { timeout: 0 }))) {
        await testSubjects.click(`monitor-page-link-${monitorId}`);
        await testSubjects.existOrFail('uptimeMonitorPage', {
          timeout: 30000,
        });
      }
    },

    goToCertificates: async () => {
      return retry.tryForTime(30 * 1000, async () => {
        await testSubjects.click('uptimeCertificatesLink');
        await testSubjects.existOrFail('uptimeCertificatesPage');
      });
    },

    async loadDataAndGoToMonitorPage(dateStart: string, dateEnd: string, monitorId: string) {
      await PageObjects.timePicker.setAbsoluteRange(dateStart, dateEnd);
      await this.goToMonitor(monitorId);
    },
  };
}
