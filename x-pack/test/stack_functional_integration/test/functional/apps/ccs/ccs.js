/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('Cross cluster search test', async () => {
    const PageObjects = getPageObjects([
      'common',
      'settings',
      'discover',
      'security',
      'header',
      'timePicker',
    ]);
    const retry = getService('retry');
    const log = getService('log');
    const browser = getService('browser');
    const appsMenu = getService('appsMenu');
    const kibanaServer = getService('kibanaServer');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      // pincking relative time in timepicker isn't working.  This is also faster.
      // It's the default set, plus new "makelogs" +/- 3 days from now
      await kibanaServer.uiSettings.replace({
        'timepicker:quickRanges': `[
        {
          "from": "now-3d",
          "to": "now+3d",
          "display": "makelogs"
        },
        {
          "from": "now/d",
          "to": "now/d",
          "display": "Today"
        },
        {
          "from": "now/w",
          "to": "now/w",
          "display": "This week"
        },
        {
          "from": "now-15m",
          "to": "now",
          "display": "Last 15 minutes"
        },
        {
          "from": "now-30m",
          "to": "now",
          "display": "Last 30 minutes"
        },
        {
          "from": "now-1h",
          "to": "now",
          "display": "Last 1 hour"
        },
        {
          "from": "now-24h",
          "to": "now",
          "display": "Last 24 hours"
        },
        {
          "from": "now-7d",
          "to": "now",
          "display": "Last 7 days"
        },
        {
          "from": "now-30d",
          "to": "now",
          "display": "Last 30 days"
        },
        {
          "from": "now-90d",
          "to": "now",
          "display": "Last 90 days"
        },
        {
          "from": "now-1y",
          "to": "now",
          "display": "Last 1 year"
        }
      ]`,
      });
    });

    before(async () => {
      if (process.env.SECURITY === 'YES') {
        log.debug(
          '### provisionedEnv.SECURITY === YES so log in as elastic superuser to create cross cluster indices'
        );
        await PageObjects.security.logout();
      }
      const url = await browser.getCurrentUrl();
      log.debug(url);
      if (!url.includes('kibana')) {
        await PageObjects.common.navigateToApp('management', { insertTimestamp: false });
      } else if (!url.includes('management')) {
        await appsMenu.clickLink('Management');
      }
    });

    it('create local admin makelogs index pattern', async () => {
      log.debug('create local admin makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('local:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('local:makelogs工程*');
    });

    it('create remote data makelogs index pattern', async () => {
      log.debug('create remote data makelogs工程 index pattern');
      await PageObjects.settings.createIndexPattern('data:makelogs工程*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程*');
    });

    it('create comma separated index patterns for data and local makelogs index pattern', async () => {
      log.debug(
        'create comma separated index patterns for data and local makelogs工程 index pattern'
      );
      await PageObjects.settings.createIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('data:makelogs工程-*,local:makelogs工程-*');
    });

    it('create index pattern for data from both clusters', async () => {
      await PageObjects.settings.createIndexPattern('*:makelogs工程-*', '@timestamp', true, false);
      const patternName = await PageObjects.settings.getIndexPageHeading();
      expect(patternName).to.be('*:makelogs工程-*');
    });

    it('local:makelogs(star) should discover data from the local cluster', async () => {
      await PageObjects.common.navigateToApp('discover', { insertTimestamp: false });

      await PageObjects.discover.selectIndexPattern('local:makelogs工程*');
      await PageObjects.timePicker.setCommonlyUsedTime('makelogs');
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
      await PageObjects.timePicker.setCommonlyUsedTime('makelogs');
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
