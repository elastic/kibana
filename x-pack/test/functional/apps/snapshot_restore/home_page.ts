/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'snapshotRestore']);
  const log = getService('log');
  const es = getService('es');
  const security = getService('security');

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['snapshot_restore_user'], { skipBrowserRefresh: true });
      await pageObjects.common.navigateToApp('snapshotRestore');
    });

    it('Loads the app', async () => {
      const appTitle = 'Snapshot and Restore';
      await log.debug(`Checking for app title to be ${appTitle}`);
      const appTitleText = await pageObjects.snapshotRestore.appTitleText();
      expect(appTitleText).to.be(appTitle);

      const repositoriesButton = await pageObjects.snapshotRestore.registerRepositoryButton();
      expect(await repositoriesButton.isDisplayed()).to.be(true);
    });

    describe('Repositories Tab', async () => {
      before(async () => {
        await es.snapshot.createRepository({
          name: 'my-repository',
          body: {
            type: 'fs',
            settings: {
              location: '/tmp/es-backups/',
              compress: true,
            },
          },
          verify: true,
        });
        await pageObjects.snapshotRestore.navToRepositories();
      });

      it('cleanup repository', async () => {
        await pageObjects.snapshotRestore.viewRepositoryDetails('my-repository');
        const cleanupResponse = await pageObjects.snapshotRestore.performRepositoryCleanup();
        expect(cleanupResponse).to.contain('results');
        expect(cleanupResponse).to.contain('deleted_bytes');
        expect(cleanupResponse).to.contain('deleted_blobs');
      });
      after(async () => {
        await es.snapshot.deleteRepository({
          name: 'my-repository',
        });
        await security.testUser.restoreDefaults();
      });
    });
  });
};
