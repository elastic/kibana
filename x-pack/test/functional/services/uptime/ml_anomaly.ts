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

  const alreadyHasJob = async () => {
    return await testSubjects.exists('uptimeManageMLJobBtn');
  };

  return {
    async openMLFlyoutOrMenu() {
      return retry.tryForTime(15000, async () => {
        if (await testSubjects.exists('uptimeEnableAnomalyBtn')) {
          await this.openMLFlyout();
        } else if (await testSubjects.exists('uptimeManageMLJobBtn')) {
          await openMLManageMenu();
        }
      });
    },
    async openMLFlyout() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.click('uptimeEnableAnomalyBtn');
        await testSubjects.existOrFail('uptimeMLFlyout');
      });
    },
    async openMLManageMenu() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.click('uptimeManageMLJobBtn');
        await testSubjects.existOrFail('uptimeManageMLContextMenu');
      });
    },
    async alreadyHasJob() {
      return await alreadyHasJob();
    },
    async createMLJob() {
      await this.openMLFlyout();
      await testSubjects.click('uptimeMLCreateJobBtn');
      return retry.tryForTime(15000, async () => {
        await testSubjects.existOrFail('uptimeMLJobSuccessfullyCreated');
        log.info('Job successfully created');
      });
    },

    async deleteMLJob() {
      await this.openMLManageMenu();
      await testSubjects.click('uptimeDeleteMLJobBtn');
      return retry.tryForTime(15000, async () => {
        await testSubjects.click('uptimeMLJobDeleteConfirmModel > confirmModalConfirmButton');
        await testSubjects.existOrFail('uptimeMLJobSuccessfullyDeleted');
        log.info('Job successfully deleted');
      });
    },
    async canCreateJob() {
      return !!(await (await testSubjects.find('uptimeMLCreateJobBtn')).getAttribute('disabled'));
    },
    async hadLicenseInfo() {
      return await testSubjects.exists('uptimeMLLicenseInfo');
    },
  };
}
