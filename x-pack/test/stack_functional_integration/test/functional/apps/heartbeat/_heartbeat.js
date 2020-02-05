/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects(['common', 'uptime']);

  describe('check heartbeat', function() {
    it('Uptime app should show snapshot count  greater than zero', async function() {
      const url = await browser.getCurrentUrl();
      log.debug(url);
      if (!url.includes('kibana')) {
        await PageObjects.common.navigateToApp('uptime');
      } else if (!url.includes('uptime')) {
        await appsMenu.clickLink('Uptime');
      }

      await retry.try(async function() {
        const upCount = parseInt((await PageObjects.uptime.getSnapshotCount()).up);
        expect(upCount).to.be.greaterThan(0);
      });
    });
  });
}
