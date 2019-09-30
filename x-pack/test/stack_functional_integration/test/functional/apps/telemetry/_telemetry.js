import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'monitoring']);

  describe('telemetry', function() {
    before(async () => {
      log.debug('monitoring');
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('monitoring');
    });

    it('should show banner Help us improve Kibana and Elasticsearch', async () => {
      const expectedMessage = `Help us improve the Elastic Stack!
Help us improve the Elastic Stack by providing usage statistics for basic features. We will not share this data outside of Elastic. Read more
Yes
No`;
      const actualMessage = await PageObjects.monitoring.getWelcome();
      log.debug(`X-Pack message = ${actualMessage}`);
      expect(actualMessage).to.be(expectedMessage);
    });

  });

}
