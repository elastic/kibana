/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { TestInvoker } from './lib/types';

// eslint-disable-next-line import/no-default-export
export default function codeIntelligenceFunctionalTests({
  getService,
  getPageObjects,
}: TestInvoker) {
  // const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const config = getService('config');
  const FIND_TIME = config.get('timeouts.find');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  // FAILING: https://github.com/elastic/kibana/issues/36480
  describe.skip('Code Intelligence', () => {
    describe('Code intelligence in source view page', () => {
      const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';
      const testGoToDefinition = async () => {
        await retry.try(async () => {
          expect(await testSubjects.exists('codeSourceViewer')).to.be(true);
        });

        // Hover on the 'UserModel' reference on line 5.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk31', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const userModelSpan = spans[1];
          expect(await userModelSpan.getVisibleText()).to.equal('UserModel');
          await browser.moveMouseTo(userModelSpan);
          // Expect the go to definition button show up eventually.
          expect(await testSubjects.exists('codeGoToDefinitionButton')).to.be(true);

          await testSubjects.click('codeGoToDefinitionButton');
          await retry.tryForTime(5000, async () => {
            const currentUrl: string = await browser.getCurrentUrl();
            log.info(`Jump to url: ${currentUrl}`);
            // Expect to jump to src/models/User.ts file on line 5.
            expect(currentUrl.indexOf('src/models/User.ts!L5:13')).to.greaterThan(0);
          });
        });
      };
      const testGoToDefinitionFromRoot = async () => {
        log.debug('Hover on a reference and jump to definition across file');

        // Visit the /src/controllers/user.ts file
        // Wait the file tree to be rendered and click the 'src' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');

        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src/controllers')).to.be(
            true
          );
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/controllers');
        // Then the 'controllers' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-File-src/controllers/user.ts')).to.be(
            true
          );
        });

        await testSubjects.click('codeFileTreeNode-File-src/controllers/user.ts');
        // Then the 'user.ts' file on the file tree.
        await testGoToDefinition();
      };

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
          expect(await testSubjects.exists('confirmModalConfirmButton')).to.be(true);
        });

        await testSubjects.click('confirmModalConfirmButton');

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(0);
        });
        await retry.tryForTime(300000, async () => {
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

      it('Hover on a reference and jump to definition across file', async () => {
        await testGoToDefinitionFromRoot();

        // can go back and go to definition again
        await browser.goBack();
        await testGoToDefinition();
      });

      it('Find references and jump to reference', async () => {
        log.debug('Find references and jump to reference');

        // Visit the /src/models/User.ts file
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

        // Hover on the 'UserModel' reference on line 5.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk31', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const userModelSpan = spans[0];
          expect(await userModelSpan.getVisibleText()).to.equal('UserModel');
          await browser.moveMouseTo(userModelSpan);
          // Expect the go to definition button show up eventually.
          expect(await testSubjects.exists('codeFindReferenceButton')).to.be(true);

          await testSubjects.click('codeFindReferenceButton');
          await retry.tryForTime(5000, async () => {
            // Expect the find references panel show up and having highlights.
            const highlightSpans = await find.allByCssSelector('.codeSearch__highlight', FIND_TIME);
            expect(highlightSpans.length).to.greaterThan(0);
            const firstReference = highlightSpans[0];
            await firstReference.click();
            const currentUrl: string = await browser.getCurrentUrl();
            log.info(`Jump to url: ${currentUrl}`);
            // Expect to jump to src/controllers/user.ts file on line 42.
            expect(currentUrl.indexOf('src/controllers/user.ts!L42:0')).to.greaterThan(0);
          });
        });
      });

      it('Hover on a reference and jump to a different repository', async () => {
        log.debug('Hover on a reference and jump to a different repository');

        // Visit the /src/controllers/user.ts file
        // Wait the file tree to be rendered and click the 'src' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-Directory-src/controllers')).to.be(
            true
          );
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/controllers');
        // Then the 'controllers' folder on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeFileTreeNode-File-src/controllers/user.ts')).to.be(
            true
          );
        });

        await testSubjects.click('codeFileTreeNode-File-src/controllers/user.ts');
        // Then the 'user.ts' file on the file tree.
        await retry.try(async () => {
          expect(await testSubjects.exists('codeSourceViewer')).to.be(true);
        });

        // Hover on the 'async' reference on line 1.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk17', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const asyncSpan = spans[1];
          expect(await asyncSpan.getVisibleText()).to.equal('async');
          await browser.moveMouseTo(asyncSpan);
          // Expect the go to definition button show up eventually.
          expect(await testSubjects.exists('codeGoToDefinitionButton')).to.be(true);

          await testSubjects.click('codeGoToDefinitionButton');
          // TODO: figure out why jenkins will fail the following test while locally it
          // passes.
          // await retry.tryForTime(5000, async () => {
          //   const currentUrl: string = await browser.getCurrentUrl();
          //   log.error(`Jump to url: ${currentUrl}`);
          //   // Expect to jump to repository github.com/DefinitelyTyped/DefinitelyTyped.
          //   expect(currentUrl.indexOf('github.com/DefinitelyTyped/DefinitelyTyped')).to.greaterThan(
          //     0
          //   );
          // });

          // it should goes back to controllers/user.ts
          // await browser.goBack();

          // await retry.try(async () => {
          //   const $spans = await find.allByCssSelector('.mtk31', FIND_TIME);
          //   expect($spans.length).to.greaterThan(1);
          //   const $userModelSpan = $spans[1];
          //   expect(await $userModelSpan.getVisibleText()).to.equal('UserModel');
          // });
        });
      });
    });
  });
}
