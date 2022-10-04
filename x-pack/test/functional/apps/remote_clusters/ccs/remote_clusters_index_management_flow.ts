/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'remoteClusters', 'indexManagement']);
  const security = getService('security');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const remoteEs = getService('remoteEs' as 'es');

  describe('CCS Remote Clusters > Index Management', function () {
    before(async () => {
      await security.testUser.setRoles(['global_ccr_role']);
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('Remote Clusters', function () {
      before(async () => {
        await pageObjects.common.navigateToApp('remoteClusters');
      });

      it('Verify ftr-remote in remote clusters', async () => {
        await retry.waitFor('table to be visible', async () => {
          return await testSubjects.isDisplayed('remoteClusterListTable');
        });
        const remotes = await pageObjects.remoteClusters.getRemoteClustersList();
        expect(remotes.length).to.eql(1);
        expect(remotes[0].remoteName).to.eql('ftr-remote');
        expect(remotes[0].remoteAddress).to.contain('localhost');
        expect(remotes[0].remoteStatus).to.eql('Connected');
        expect(remotes[0].remoteConnectionCount).to.eql('1');
        expect(remotes[0].remoteMode).to.eql('default');
      });
    });

    describe('Index Mangement', function () {
      before(async () => {
        // await remoteEs.
        await pageObjects.common.navigateToApp('indexManagement');
      });
    });
  });
};
