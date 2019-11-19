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
      // await retry.try(async () => {
      //   await PageObjects.header.setQuickSpan('Today');
      // });
      await PageObjects.timePicker.setCommonlyUsedTime('superDatePickerCommonlyUsed_This_week');
      await retry.try(async () => {
        const hitCount = parseInt(await PageObjects.discover.getHitCount());
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
