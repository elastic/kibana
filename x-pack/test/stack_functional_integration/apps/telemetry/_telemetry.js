/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const browser = getService('browser');
  const appsMenu = getService('appsMenu');
  const PageObjects = getPageObjects(['common', 'monitoring', 'header']);

  describe('telemetry', function () {
    before(async () => {
      log.debug('monitoring');
      await browser.setWindowSize(1200, 800);
      await appsMenu.clickLink('Stack Monitoring');
    });

    it('should show banner Help us improve the Elastic Stack', async () => {
      const actualMessage = await PageObjects.monitoring.getWelcome();
      log.debug(`X-Pack message = ${actualMessage}`);
      expect(actualMessage).to.contain('Help us improve the Elastic Stack');
    });
  });
};
