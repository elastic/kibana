/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function exploreRepositoryFunctonalTests({
  getService,
  getPageObjects,
}: TestInvoker) {
  // const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  describe('Code', () => {
    describe('Explore a repository', () => {
      const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';

      before(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        // Prepare a git repository for the test
        await PageObjects.code.fillImportRepositoryUrlInputBox(
          'https://github.com/Microsoft/TypeScript-Node-Starter'
        );
        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'Microsoft/TypeScript-Node-Starter'
          );

          // Wait for the index to start.
          await retry.try(async () => {
            expect(await testSubjects.exists('repositoryIndexOngoing')).to.be(true);
          });
          // Wait for the index to end.
          await retry.try(async () => {
            expect(await testSubjects.exists('repositoryIndexDone')).to.be(true);
          });
        });
      });

      after(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        // Clean up the imported repository
        await PageObjects.code.clickDeleteRepositoryButton();
        await retry.try(async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(0);
        });

        await PageObjects.security.logout();
      });

      beforeEach(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        // Enter the first repository from the admin page.
        await testSubjects.click(repositoryListSelector);
      });

      it('Click file/directory on the file tree', async () => {
        log.debug('Click a file in the source tree');
        // Wait the file tree to be rendered and click the 'src' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src/models')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/models');
        // Then the 'models' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-File-src/models/User.ts')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-File-src/models/User.ts');
        // Then the 'User.ts' file on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeSourceViewer')).to.be(true);
        });
      });

      it('Click file/directory on the right panel', async () => {
        log.debug('Click file/directory on the right panel');

        // Wait the file tree to be rendered and click the 'src' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-src')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-src');
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-models')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-models');
        // Then the 'models' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-User.ts')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-User.ts');
        // Then the 'User.ts' file on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeSourceViewer')).to.be(true);
        });
      });

      it('Navigate source file via structure tree', async () => {
        log.debug('Navigate source file via structure tree');
        // Wait the file tree to be rendered and click the 'src' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-src')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-src');
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-models')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-models');
        // Then the 'models' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileExplorerNode-User.ts')).to.be(true);
        });

        await testSubjects.click('codeFileExplorerNode-User.ts');
        // Then the 'User.ts' file on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeSourceViewer')).to.be(true);
          expect(await testSubjects.exists('codeStructureTreeTab')).to.be(true);
        });

        // Click the structure tree tab
        await testSubjects.click('codeStructureTreeTab');
        await retry.tryForTime(300000, async () => {
          expect(await testSubjects.exists('codeStructureTreeNode-User')).to.be(true);

          await testSubjects.click('codeStructureTreeNode-User');
          await retry.tryForTime(5000, async () => {
            const currentUrl: string = await browser.getCurrentUrl();
            log.info(`Jump to url: ${currentUrl}`);
            expect(currentUrl.indexOf('src/models/User.ts!L92:6') > 0).to.be(true);
          });
        });
      });
    });
  });
}
