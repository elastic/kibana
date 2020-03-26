/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
    async locationMapIsRendered() {
      return retry.tryForTime(15000, async () => {
        await testSubjects.existOrFail('xpack.uptime.locationMap.embeddedPanel', {
          timeout: 3000,
        });
        const mapPanel = await testSubjects.find('xpack.uptime.locationMap.embeddedPanel');

        await find.descendantExistsByCssSelector('canvas.mapboxgl-canvas', mapPanel);
      });
    },
  };
}
