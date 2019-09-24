
import expect from 'expect.js';

import {
  bdd,
  remote,
  esClient
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('Cross cluster search test', function describeIndexTests() {
  bdd.before(async function () {
    PageObjects.remote.setWindowSize(1200,800);
    if (varHashMap.SECURITY === 'YES') {
      await PageObjects.shield.logout();
      PageObjects.common.debug('varHashMap.SECURITY === YES so log in as elastic superuser to create cross cluster indices');
    }
    await PageObjects.settings.navigateTo();
  });

  bdd.it('create local admin makelogs index pattern', function pageHeader() {
    PageObjects.common.debug('create local admin makelogs工程 index pattern');
    return PageObjects.settings.createIndexPattern('local:makelogs工程*');
    return PageObjects.settings.getIndexPageHeading().getVisibleText()
    .then(function (patternName) {
      expect(patternName).to.be('local:makelogs工程*');
    });
  });

  bdd.it('create remote data makelogs index pattern', function pageHeader() {
    PageObjects.common.debug('create remote data makelogs工程 index pattern');
    return PageObjects.settings.createIndexPattern('data:makelogs工程*');
    return PageObjects.settings.getIndexPageHeading().getVisibleText()
    .then(function (patternName) {
      expect(patternName).to.be('data:makelogs工程*');
    });
  });

  bdd.it('create comma separated index patterns for data and local makelogs index pattern', function pageHeader() {
    PageObjects.common.debug('create comma separated index patterns for data and local makelogs工程 index pattern');
    return PageObjects.settings.createIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
    return PageObjects.settings.getIndexPageHeading().getVisibleText()
    .then(function (patternName) {
      expect(patternName).to.be('data:makelogs工程-*,local:makelogs工程-*');
    });
  });

// https://github.com/elastic/kibana/issues/16098
  bdd.it('create index pattern for data from both clusters', function pageHeader() {
    PageObjects.common.debug('create remote data makelogs工程 index pattern');
    return PageObjects.settings.createIndexPattern('*:makelogs工程-*');
    return PageObjects.settings.getIndexPageHeading().getVisibleText()
     .then(function (patternName) {
       expect(patternName).to.be('*:makelogs工程-*');
     });
  });

  bdd.it('local:makelogs(star) should discover data from the local cluster', async function () {
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.selectIndexPattern('local:makelogs工程*');
    await PageObjects.header.setRelativeRange('3','d','3', 'd+');  // s=seconds, m=minutes. h=hours, d=days, w=weeks, d+=days from now
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      PageObjects.common.debug('hit count = ' + hitCount);
      expect(hitCount).to.be('14,005');
    });
  });

  bdd.it('data:makelogs(star) should discover data from remote', async function () {
    await PageObjects.discover.selectIndexPattern('data:makelogs工程*');
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      PageObjects.common.debug('hit count = ' + hitCount);
      expect(hitCount).to.be('14,005');
    });
  });

  bdd.it('star:makelogs-star should discover data from both clusters', async function () {
    await PageObjects.discover.selectIndexPattern('*:makelogs工程-*');
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      PageObjects.common.debug('hit count = ' + hitCount);
      expect(hitCount).to.be('28,010');
    });
  });

  bdd.it('data:makelogs-star,local:makelogs-star should discover data from both clusters', async function () {
    await PageObjects.discover.selectIndexPattern('data:makelogs工程-*,local:makelogs工程-*');
    await PageObjects.common.tryForTime(40000, async () => {
      const hitCount = await PageObjects.discover.getHitCount();
      PageObjects.common.debug('hit count = ' + hitCount);
      expect(hitCount).to.be('28,010');
    });
  });

});
