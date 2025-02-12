/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'remoteClusters']);
  const security = getService('security');

  describe('Home page', function () {
    before(async () => {
      this.tags('skipCloud');
      await security.testUser.setRoles(['global_ccr_role']);
      await pageObjects.common.navigateToApp('remoteClusters');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      const remoteClusterButton = await pageObjects.remoteClusters.remoteClusterCreateButton();
      expect(await remoteClusterButton.isDisplayed()).to.be(true);
    });
  });
};
