/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeMLAnomalyProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');

  return {
    async openMLFlyout() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.click('uptimeEnableAnomalyBtn');
        await testSubjects.existOrFail('uptimeMLFlyout');
      });
    },

    async openMLManageMenu() {
      await this.cancelAlertFlyout();
      return retry.tryForTime(30000, async () => {
        await testSubjects.click('uptimeManageMLJobBtn');
        await testSubjects.existOrFail('uptimeManageMLContextMenu');
      });
    },

    async cancelAlertFlyout() {
      if (await testSubjects.exists('euiFlyoutCloseButton'))
        await testSubjects.click('euiFlyoutCloseButton', 60 * 1000);
    },

    async alreadyHasJob() {
      return await testSubjects.exists('uptimeManageMLJobBtn');
    },

    async createMLJob() {
      await testSubjects.click('uptimeMLCreateJobBtn');
      return retry.tryForTime(30000, async () => {
        await testSubjects.existOrFail('uptimeMLJobSuccessfullyCreated');
        log.info('Job successfully created');
      });
    },

    async deleteMLJob() {
      await testSubjects.click('uptimeDeleteMLJobBtn');
      return retry.tryForTime(10000, async () => {
        await testSubjects.click('uptimeMLJobDeleteConfirmModel > confirmModalConfirmButton');
        await testSubjects.existOrFail('uptimeMLJobSuccessfullyDeleted');
        log.info('Job successfully deleted');
      });
    },

    async canCreateJob() {
      const createJobBtn = await testSubjects.find('uptimeMLCreateJobBtn');
      return !!(await createJobBtn.getAttribute('disabled'));
    },

    async hasNoLicenseInfo() {
      return await testSubjects.missingOrFail('uptimeMLLicenseInfo', { timeout: 1000 });
    },

    async openAlertFlyout() {
      return await testSubjects.click('uptimeEnableAnomalyAlertBtn');
    },

    async disableAnomalyAlertIsVisible() {
      return await testSubjects.exists('uptimeDisableAnomalyAlertBtn');
    },

    async changeAlertThreshold(level: string) {
      await testSubjects.click('uptimeAnomalySeverity');
      await testSubjects.click('anomalySeveritySelect');
      await testSubjects.click(`alertAnomaly${level}`);
    },
  };
}
