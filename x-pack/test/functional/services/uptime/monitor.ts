/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeMonitorProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return {
    async locationMissingExists() {
      return await testSubjects.existOrFail('xpack.uptime.locationMap.locationMissing', {
        timeout: 3000,
      });
    },
    async displayOverallAvailability(availabilityVal: string) {
      return retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('uptimeOverallAvailability');
        const availability = await testSubjects.getVisibleText('uptimeOverallAvailability');
        expect(availability).to.be(availabilityVal);
      });
    },
    async locationMapIsRendered() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.existOrFail('xpack.uptime.locationMap.embeddedPanel', {
          timeout: 3000,
        });
        const mapPanel = await testSubjects.find('xpack.uptime.locationMap.embeddedPanel');

        await find.descendantExistsByCssSelector('canvas.mapboxgl-canvas', mapPanel);
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
    async toggleToMapView() {
      await testSubjects.click('uptimeMonitorToggleMapBtn');
    },
  };
}
