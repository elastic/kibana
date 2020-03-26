/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeNavigationProvider({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  const goToUptimeRoot = async () => {
    await retry.tryForTime(30 * 1000, async () => {
      await PageObjects.common.navigateToApp('uptime');
      await testSubjects.existOrFail('uptimeOverviewPage', { timeout: 2000 });
    });
  };

  return {
    async goToUptime() {
      await goToUptimeRoot();
    },

    goToSettings: async () => {
      await goToUptimeRoot();
      await testSubjects.click('settings-page-link', 5000);
      await testSubjects.existOrFail('uptimeSettingsPage', { timeout: 2000 });
    },

    goToMonitor: async (monitorId: string, monitorName?: string) => {
      await testSubjects.click(`monitor-page-link-${monitorId}`, 5000);
      if (
        monitorName &&
        (await testSubjects.getVisibleText('monitor-page-title')) !== monitorName
      ) {
        throw new Error('Expected monitor name not found');
      }
      await testSubjects.existOrFail('uptimeMonitorPage', {
        timeout: 30000,
      });
    },
  };
}
