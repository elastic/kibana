import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  describe('eCommerce Sample Data', function sampleData () {
    const browser = getService('browser');
    const PageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('sampledata');
      await PageObjects.common.sleep(3000);
    });

    it('install eCommerce sample data', async function installECommerceData () {
      await testSubjects.click('addSampleDataSetecommerce');
      await PageObjects.common.sleep(5000);
      // verify it's installed by finding the remove link
      await testSubjects.find('removeSampleDataSetecommerce');
    });

  });
}
