import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  describe('check filebeat', function () {
    const log = getService('log');
    const retry = getService('retry');
    const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

    before(function () {
      log.debug('navigateToApp Discover');
    });

    it('filebeat- should have hit count GT 0', async function () {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('filebeat-*');
      // await PageObjects.common.tryForTime(40000, async () => {
      //   await PageObjects.header.setQuickSpan('Today');
      // });
      await retry.try(async function () {
        const hitCount = parseInt(await PageObjects.discover.getHitCount());
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
