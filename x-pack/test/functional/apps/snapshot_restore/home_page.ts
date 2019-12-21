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
  // const testSubjects = getService('testSubjects');

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

    it('Reposiories Tab', async () => {
      before(async () => {
        await es.snapshot.createRepository({
          repository: 'my-repository',
          body: {
            type: 'fs',
          },
          verify: true,
        });

        it('cleanup repository', async () => {
          await pageObjects.snapshotRestore.navToRepositories();
        });
      });
    });
  });
};
