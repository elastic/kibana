/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { load as repoLoad, unload as repoUnload } from './repo_archiver';

export default function exploreRepositoryFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const config = getService('config');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);
  const exists = async (selector: string) =>
    await testSubjects.exists(selector, { allowHidden: true });

  describe('File Tree', function() {
    this.tags('smoke');
    const repositoryListSelector = 'codeRepositoryList > codeRepositoryItem';

    before(async () => {
      await repoLoad(
        'github.com/elastic/code-examples_flatten-directory',
        'code_examples_flatten_directory',
        config.get('kbnTestServer.installDir') || REPO_ROOT
      );
      await esArchiver.load('code/repositories/code_examples_flatten_directory');
    });

    beforeEach(async () => {
      // Navigate to the code app.
      await PageObjects.common.navigateToApp('code');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Enter the first repository from the admin page.
      await testSubjects.click(repositoryListSelector);
    });

    after(async () => {
      await PageObjects.security.logout();
      await repoUnload(
        'github.com/elastic/code-examples_flatten-directory',
        config.get('kbnTestServer.installDir') || REPO_ROOT
      );
      await esArchiver.unload('code/repositories/code_examples_flatten_directory');
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
