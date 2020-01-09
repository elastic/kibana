/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {

  describe('Cross cluster search test', async () => {
    const PageObjects = getPageObjects(['common', 'settings', 'discover']);
    const retry = getService('retry');
    const log = getService('log');
    const browser = getService('browser');
    const provisionedEnv = getService('provisionedEnv');

    before(async () => {
      await browser.setWindowSize(1200, 800);
    });

    before(async () => {
      if (provisionedEnv.SECURITY === 'YES') {
        log.debug('### provisionedEnv.SECURITY === YES so log in as elastic superuser to create cross cluster indices');
        await PageObjects.shield.logout();
      }
      await PageObjects.settings.navigateTo();
    });

    it('create local admin makelogs index pattern', async () => {
      log.debug('create local admin makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('local:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading().getVisibleText();
      expect(patternName).to.be('local:makelogs工程*');
    });

    it('create remote data makelogs index pattern', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('data:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading().getVisibleText();
      expect(patternName).to.be('data:makelogs工程*');
    });

    it('create comma separated index patterns for data and local makelogs index pattern', async () => {
      log.debug('create comma separated index patterns for data and local makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      const patternName = await PageObjects.settings.getIndexPageHeading().getVisibleText();
      expect(patternName).to.be('data:makelogs工程-*,local:makelogs工程-*');
    });

    // https://github.com/elastic/kibana/issues/16098
    it('create index pattern for data from both clusters', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('*:makelogs工程-*');
      const patternName = await PageObjects.settings.getIndexPageHeading().getVisibleText();
      expect(patternName).to.be('*:makelogs工程-*');
    });

    it('local:makelogs(star) should discover data from the local cluster', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('local:makelogs工程*');
      await PageObjects.header.setRelativeRange('3', 'd', '3', 'd+');  // s=seconds, m=minutes. h=hours, d=days, w=weeks, d+=days from now
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('14,005');
      });
    });

    it('data:makelogs(star) should discover data from remote', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程*');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('14,005');
      });
    });

    it('star:makelogs-star should discover data from both clusters', async function () {
      await PageObjects.discover.selectIndexPattern('*:makelogs工程-*');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('28,010');
      });
    });

    it('data:makelogs-star,local:makelogs-star should discover data from both clusters', async function () {
      await PageObjects.discover.selectIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      await retry.tryForTime(40000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        log.debug('### hit count = ' + hitCount);
        expect(hitCount).to.be('28,010');
      });
    });

  });
};
