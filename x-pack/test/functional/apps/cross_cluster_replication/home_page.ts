/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'crossClusterReplication']);
  const log = getService('log');
  const security = getService('security');

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['global_ccr_role']);
      await pageObjects.common.navigateToApp('crossClusterReplication');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      log.debug(`Checking for app title to be Cross-Cluster Replication`);
      const appTitleText = await pageObjects.crossClusterReplication.appTitleText();
      expect(appTitleText).to.be('Cross-Cluster Replication');

      const followerIndexButton = await pageObjects.crossClusterReplication.createFollowerIndexButton();
      expect(await followerIndexButton.isDisplayed()).to.be(true);
    });
  });
};
