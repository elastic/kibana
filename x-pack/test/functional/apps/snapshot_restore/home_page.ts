/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'snapshotRestore']);
  const log = getService('log');
  const es = getService('legacyEs');

  describe('Home page', function() {
    this.tags('smoke');
    before(async () => {
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
          repository: 'my-repository',
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
        await pageObjects.common.sleep(25000);
        const cleanupResponse = await pageObjects.snapshotRestore.performRepositoryCleanup();
        await pageObjects.common.sleep(25000);
        expect(cleanupResponse).to.contain('results');
        expect(cleanupResponse).to.contain('deleted_bytes');
        expect(cleanupResponse).to.contain('deleted_blobs');
      });
      after(async () => {
        await es.snapshot.deleteRepository({
          repository: 'my-repository',
        });
      });
    });
  });
};
