/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {

  describe('Cross cluster search test', async () => {
    const PageObjects = getPageObjects(['common', 'settings', 'discover', 'security', 'header']);
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
        await PageObjects.security.logout();
      }
      await PageObjects.settings.navigateTo();
    });

    it('create local admin makelogs index pattern', async () => {
      log.debug('create local admin makelogs工程 index pattern');
      // note that a trailing * is added to the index pattern name in this case
      await PageObjects.settings.createIndexPattern('local:makelogs工程');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('local:makelogs工程*');
    });

    it('create remote data makelogs index pattern', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      // note that a trailing * is added to the index pattern name in this case
      await PageObjects.settings.createIndexPattern('data:makelogs工程');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程*');
    });

    it('create comma separated index patterns for data and local makelogs index pattern', async () => {
      log.debug('create comma separated index patterns for data and local makelogs工程 index pattern');
      // note that a trailing * is added to the index pattern name in this case
      await PageObjects.settings.createIndexPattern('data:makelogs工程-*,local:makelogs工程-');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程-*,local:makelogs工程-*');
    });

    it('create index pattern for data from both clusters', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickKibanaIndexPatterns();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.settings.clickOptionalAddNewButton();
      await PageObjects.header.waitUntilLoadingHasFinished();
      // note that a trailing * is NOT added to the index pattern name in this case because of leading *
      await retry.try(async () => {
        await PageObjects.settings.setIndexPatternField({
          indexPatternName: '*:makelogs工程-*',
          expectWildcard: false
        });
      });
      await PageObjects.common.sleep(2000);
      await (await PageObjects.settings.getCreateIndexPatternGoToStep2Button()).click();
      await PageObjects.common.sleep(2000);
      await PageObjects.settings.selectTimeFieldOption('@timestamp');
      await (await PageObjects.settings.getCreateIndexPatternButton()).click();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.try(async () => {
        const currentUrl = await browser.getCurrentUrl();
        log.info('currentUrl', currentUrl);
        if (!currentUrl.match(/index_patterns\/.+\?/)) {
          throw new Error('Index pattern not created');
        } else {
          log.debug('Index pattern created: ' + currentUrl);
        }
      });
      const patternName = await PageObjects.settings.getIndexPageHeading();
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
