/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default ({ getService, getPageObjects }) => {
  describe('monitoring app - stack functional integration - suite', () => {
    const browser = getService('browser');
    const PageObjects = getPageObjects(['security', 'monitoring', 'common']);
    const log = getService('log');
    const testSubjects = getService('testSubjects');
    const isSaml = !!process.env.VM.includes('saml') || !!process.env.VM.includes('oidc');
    const clusterOverview = getService('monitoringClusterOverview');
    const find = getService('find');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      if (process.env.SECURITY === 'YES' && !isSaml) {
        await PageObjects.security.logout();
        log.debug('### log in as elastic superuser to enable monitoring');
        // Tests may be running as a non-superuser like `power` but that user
        // doesn't have the cluster privs to enable monitoring.
        // On the SAML config, this will fail, but the test recovers on the next
        // navigate and logs in as the saml user.
      }
      // navigateToApp without a username and password will default to the superuser
      await PageObjects.common.navigateToApp('monitoring', { insertTimestamp: false });
      await clusterOverview.acceptAlertsModal();
    });

    it('should have Monitoring already enabled', async () => {
      await find.clickByLinkText('elasticsearch');
      await testSubjects.click('esOverview');
    });

    after(async () => {
      if (process.env.SECURITY === 'YES' && !isSaml) {
        await PageObjects.security.forceLogout(isSaml);
      }
    });
  });
};
