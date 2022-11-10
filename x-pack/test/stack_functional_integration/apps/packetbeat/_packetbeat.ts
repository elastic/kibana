/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);
  const appsMenu = getService('appsMenu');

  describe('check packetbeat', function () {
    before(function () {
      log.debug('navigateToApp Discover');
    });

    it('packetbeat- should have hit count GT 0', async function () {
      const url = await browser.getCurrentUrl();
      log.debug(url);
      if (!url.includes('kibana')) {
        await PageObjects.common.navigateToApp('discover', { insertTimestamp: false });
      }
      if (!url.includes('discover')) {
        await appsMenu.clickLink('Discover');
      }
      await PageObjects.discover.selectIndexPattern('packetbeat-*');
      await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
      await retry.try(async function () {
        const hitCount = await PageObjects.discover.getHitCountInt();
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
