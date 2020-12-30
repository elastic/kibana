/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'uptime']);

  describe('check heartbeat', function () {
    it('Uptime app should show snapshot count  greater than zero', async function () {
      await PageObjects.common.navigateToApp('uptime', { insertTimestamp: false });

      await retry.try(async function () {
        const upCount = parseInt((await PageObjects.uptime.getSnapshotCount()).up);
        expect(upCount).to.be.greaterThan(0);
      });
    });
  });
}
