import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discover', 'header', 'timePicker']);

  describe('check packetbeat', function() {
    before(function() {
      log.debug('navigateToApp Discover');
    });

    it('packetbeat- should have hit count GT 0', async function() {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.selectIndexPattern('packetbeat-*');
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
