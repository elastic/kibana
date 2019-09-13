/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function exploreRepositoryFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  // const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);
  const exists = async (selector: string) => testSubjects.exists(selector, { allowHidden: true });

  // FLAKY: https://github.com/elastic/kibana/issues/45079
  describe.skip('File Tree', function() {
    this.tags('smoke');
    const repositoryListSelector = 'codeRepositoryList > codeRepositoryItem';

    before(async () => {
      // Navigate to the code app.
      await PageObjects.common.navigateToApp('code');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Prepare a git repository for the test
      await PageObjects.code.fillImportRepositoryUrlInputBox(
        'https://github.com/elastic/code-examples_flatten-directory.git'
      );
      // Click the import repository button.
      await PageObjects.code.clickImportRepositoryButton();

      await retry.tryForTime(10000, async () => {
        const repositoryItems = await testSubjects.findAll(repositoryListSelector);
        expect(repositoryItems).to.have.length(1);
        expect(await repositoryItems[0].getVisibleText()).to.equal(
          'elastic/code-examples_flatten-directory'
        );
      });

      await retry.try(async () => {
        expect(await exists('repositoryIndexOngoing')).to.be(true);
      });
    });

    beforeEach(async () => {
      // Navigate to the code app.
      await PageObjects.common.navigateToApp('code');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Enter the first repository from the admin page.
      await testSubjects.click(repositoryListSelector);
    });

    after(async () => {
      // Navigate to the code app.
      await PageObjects.common.navigateToApp('code');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Clean up the imported repository
      await PageObjects.code.clickDeleteRepositoryButton();

      await retry.try(async () => {
        expect(await exists('confirmModalConfirmButton')).to.be(true);
      });

      await testSubjects.click('confirmModalConfirmButton');

      await retry.tryForTime(300000, async () => {
        const repositoryItems = await testSubjects.findAll(repositoryListSelector);
        expect(repositoryItems).to.have.length(0);
      });

      await PageObjects.security.logout();
    });

    it('tree should be loaded', async () => {
      await retry.tryForTime(5000, async () => {
        expect(await exists('codeFileTreeNode-Directory-elastic/src/code')).ok();
        expect(await exists('codeFileTreeNode-Directory-kibana/src/code')).ok();
        expect(await exists('codeFileTreeNode-File-README.MD')).ok();
      });
    });

    it('Click file/directory on the file tree', async () => {
      await testSubjects.click('codeFileTreeNode-Directory-elastic/src/code');

      await retry.tryForTime(1000, async () => {
        // should only open one folder at this time
        expect(await exists('codeFileTreeNode-Directory-Icon-elastic/src/code-open')).ok();
        expect(await exists('codeFileTreeNode-Directory-Icon-kibana/src/code-closed')).ok();
      });

      await browser.refresh();

      await PageObjects.header.awaitKibanaChrome();

      await testSubjects.waitForDeleted('.euiLoadingSpinner');

      await retry.tryForTime(30000, async () => {
        // should only open one folder at this time
        expect(await exists('codeFileTreeNode-Directory-Icon-elastic/src/code-open')).ok();
        expect(await exists('codeFileTreeNode-Directory-Icon-kibana/src/code-closed')).ok();
      });

      await testSubjects.click('codeFileTreeNode-Directory-kibana/src/code');

      await retry.tryForTime(1000, async () => {
        // should open two folders at this time
        expect(await exists('codeFileTreeNode-Directory-Icon-elastic/src/code-open')).ok();
        expect(await exists('codeFileTreeNode-Directory-Icon-kibana/src/code-open')).ok();
      });

      await testSubjects.click('codeFileTreeNode-Directory-elastic/src/code');

      await retry.tryForTime(1000, async () => {
        // should only open one folder at this time
        expect(await exists('codeFileTreeNode-Directory-Icon-elastic/src/code-closed')).ok();
        expect(await exists('codeFileTreeNode-Directory-Icon-kibana/src/code-open')).ok();
      });
    });
  });
}
