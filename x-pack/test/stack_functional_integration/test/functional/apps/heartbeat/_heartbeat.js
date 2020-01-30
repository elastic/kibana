/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['common', 'discover', 'timepicker']);
  const log = getService('log');
  const retry = getService('retry');

  describe('check heartbeat', function() {
    before(async function() {
      await retry.tryForTime(120000, async function() {
        await PageObjects.common.navigateToApp('settings', 'power', 'changeme');
        log.debug('create Index Pattern');
        await PageObjects.settings.createIndexPattern('heartbeat-*');
      });
      log.debug('navigateToApp Discover');
      return PageObjects.common.navigateToApp('discover');
    });

    it('heartbeat- should have hit count GT 0', async function() {
      //  await PageObjects.header.clickDiscover();
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('heartbeat-*');
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_Today');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.be.greaterThan('0');
      });
    });
  });
}
