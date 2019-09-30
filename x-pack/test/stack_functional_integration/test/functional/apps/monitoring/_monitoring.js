import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('monitoring app', () => {
    const provisionedEnv = getService('provisionedEnv');
    const browser = getService('browser');
    const PageObjects = getPageObjects(['shield', 'monitoring', 'common']);
    const monitoringNoData = getService('monitoringNoData');

    before(async function() {
      await browser.setWindowSize(1200, 800);
      if (provisionedEnv.SECURITY === 'YES') {
        await PageObjects.shield.logout();
        PageObjects.common.debug('provisionedEnv.SECURITY === YES so log in as elastic superuser to enable monitoring');
        // Tests may be running as a non-superuser like `power` but that user
        // doesn't have the cluster privs to enable monitoring.
        // On the SAML config, this will fail, but the test recovers on the next
        // navigate and logs in as the saml user.
      }
      // navigateToApp without a username and password will default to the superuser
      await PageObjects.common.navigateToApp('monitoring');
    });

    it('should enable Monitoring', async () => {
      await monitoringNoData.enableMonitoring();
    });

    after(async () => {
      if (provisionedEnv.SECURITY === 'YES') {
        await PageObjects.shield.logout();
      }
    });

  });
}
