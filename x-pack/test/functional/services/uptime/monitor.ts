/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeMonitorProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const PageObjects = getPageObjects(['header']);

  return {
    async displayOverallAvailability(availabilityVal: string) {
      return retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('uptimeOverallAvailability');
        const availability = await testSubjects.getVisibleText('uptimeOverallAvailability');
        expect(availability).to.be(availabilityVal);
      });
    },
    async setPingListLocation(location: string) {
      await testSubjects.click('xpack.uptime.pingList.locationSelect', 5000);
      return testSubjects.click(`xpack.uptime.pingList.locationOptions.${location}`, 5000);
    },
    async setPingListStatus(status: string) {
      await testSubjects.click('xpack.uptime.pingList.statusSelect', 5000);
      return testSubjects.click(`xpack.uptime.pingList.statusOptions.${status}`, 5000);
    },
    async checkForPingListTimestamps(timestamps: string[]): Promise<void> {
      return retry.tryForTime(10000, async () => {
        await Promise.all(
          timestamps.map(
            async (timestamp) =>
              await testSubjects.existOrFail(`xpack.uptime.pingList.ping-${timestamp}`)
          )
        );
      });
    },
    async hasRedirectInfo() {
      return retry.tryForTime(30000, async () => {
        await testSubjects.existOrFail('uptimeMonitorRedirectInfo');
      });
    },
    async expandPingRow() {
      return retry.tryForTime(
        60 * 3000,
        async () => {
          await testSubjects.existOrFail('uptimePingListExpandBtn', { timeout: 5000 });
          await testSubjects.click('uptimePingListExpandBtn');
        },
        async () => {
          await testSubjects.click('superDatePickerApplyTimeButton');
          await PageObjects.header.waitUntilLoadingHasFinished();
        }
      );
    },
    async hasRedirectInfoInPingList() {
      await this.expandPingRow();
      return retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('uptimeMonitorPingListRedirectInfo');
      });
    },
  };
}
