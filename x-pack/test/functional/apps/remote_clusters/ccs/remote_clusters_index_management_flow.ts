/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'remoteClusters']);
  const security = getService('security');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  describe.only('CCS Remote Clusters > Index Management', function () {
    before(async () => {
      await security.testUser.setRoles(['global_ccr_role']);
      await pageObjects.common.navigateToApp('remoteClusters');
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Add remote cluster and add be able to see data', async () => {
      await retry.waitFor('table to be visible', async () => {
        return await testSubjects.isDisplayed('remoteClusterListTable');
      });
      const remotes = await pageObjects.remoteClusters.getRemoteClustersList();
      expect(remotes.length).to.eql(1);
      expect(remotes[1].remoteName).to.eql('ftr-remote');
      expect(remotes[1].remoteAddress).to.contain('localhost');
    });
  });
};
