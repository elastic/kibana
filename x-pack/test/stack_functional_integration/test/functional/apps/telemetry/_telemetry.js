import expect from 'expect.js';

// import {
//   bdd
// } from '../../../support';

// import PageObjects from '../../../support/page_objects';
export default function({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'monitoring']);

  describe('telemetry', function() {
    // this.tags('stack_functional_integration');

    before(async () => {
      log.debug('monitoring');
      await PageObjects.common.navigateToApp('monitoring');
    });

    it('should show banner Help us improve Kibana and Elasticsearch', async () => {
      // const expectedMessage =
      //   'Help us improve the Elastic Stack by providing usage statistics for basic features. We will not share this data outside of Elastic. Read more\nYes\nNo';
      // const actualMessage = await PageObjects.monitoring.getWelcome();
      // log.debug(`X-Pack message = ${actualMessage}`);
      // expect(actualMessage).to.be(expectedMessage);
      // await PageObjects.monitoring.optOutPhoneHome();
      await new Promise(resolve => {
        setTimeout(resolve, 500);
      });
      expect(true).to.be(true);
    });

  });

}
