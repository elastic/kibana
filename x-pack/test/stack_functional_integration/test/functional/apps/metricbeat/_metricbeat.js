import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  describe('check metricbeat', function () {

    it('metricbeat- should have hit count GT 0', async function () {
      log.debug('navigateToApp Discover');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('metricbeat-*');
      // await retry.try(async function() {
      //   await PageObjects.header.setQuickSpan('Today');
      // });
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount());
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
