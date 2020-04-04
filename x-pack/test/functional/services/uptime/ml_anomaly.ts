/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeMLAnomalyProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const alreadyHasJob = async (timeout?: number) => {
    return await testSubjects.exists('uptimeManageMLJobBtn', {
      timeout: timeout ?? 0,
    });
  };

  return {
    async openMLFlyoutOrMenu() {
      return retry.tryForTime(15000, async () => {
        if (
          await testSubjects.exists('uptimeEnableAnomalyBtn', {
            timeout: 1000,
          })
        ) {
          await testSubjects.click('uptimeEnableAnomalyBtn');
          await testSubjects.existOrFail('uptimeMLFlyout', {
            timeout: 3000,
          });
        } else if (
          await testSubjects.exists('uptimeManageMLJobBtn', {
            timeout: 1000,
          })
        ) {
          await testSubjects.click('uptimeManageMLJobBtn');
          await testSubjects.existOrFail('uptimeManageMLContextMenu', {
            timeout: 3000,
          });
        }
      });
    },
    async alreadyHasJob() {
      return await alreadyHasJob();
    },
    async createMLJob() {
      return retry.tryForTime(15000, async () => {
        this.openMLFlyoutOrMenu();
        await testSubjects.click('uptimeMLCreateJobBtn');
        await testSubjects.existOrFail('uptimeMLJobSuccessfullyCreated');
      });
    },

    async deleteMLJob() {
      if (await alreadyHasJob(5000)) {
        this.openMLFlyoutOrMenu();
        return retry.tryForTime(15000, async () => {
          await testSubjects.click('uptimeDeleteMLJobBtn', 2000);
          await testSubjects.click(
            'uptimeMLJobDeleteConfirmModel > confirmModalConfirmButton',
            2000
          );
          await testSubjects.existOrFail('uptimeMLJobSuccessfullyDeleted', {
            timeout: 5000,
          });
        });
      }
    },
  };
}
