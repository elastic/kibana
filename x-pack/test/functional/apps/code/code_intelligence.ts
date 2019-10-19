/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { load as repoLoad, unload as repoUnload } from './repo_archiver';

export default function codeIntelligenceFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const find = getService('find');
  const config = getService('config');
  const FIND_TIME = config.get('timeouts.find');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  const exists = async (selector: string) =>
    await testSubjects.exists(selector, { allowHidden: true });

  // FLAKY: https://github.com/elastic/kibana/issues/45094
  describe.skip('Code Intelligence', () => {
    describe('Code intelligence in source view page', () => {
      const repositoryListSelector = 'codeRepositoryList > codeRepositoryItem';
      const testGoToDefinition = async () => {
        await retry.try(async () => {
          expect(await exists('codeSourceViewer')).to.be(true);
        });

        // Hover on the 'UserModel' reference on line 5.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk32', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const userModelSpan = spans[1];
          expect(await userModelSpan.getVisibleText()).to.equal('UserModel');
          await userModelSpan.moveMouseTo();
          // Expect the go to definition button show up eventually.
          expect(await exists('codeGoToDefinitionButton')).to.be(true);

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
          expect(await exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');

        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-Directory-src/controllers')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/controllers');
        // Then the 'controllers' folder on the file tree.
        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-File-src/controllers/user.ts')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-File-src/controllers/user.ts');
        // Then the 'user.ts' file on the file tree.
        await testGoToDefinition();
      };

      before(async () => {
        await repoLoad(
          'github.com/elastic/TypeScript-Node-Starter',
          'typescript_node_starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
        await esArchiver.load('code/repositories/typescript_node_starter');
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await esArchiver.unload('code/repositories/typescript_node_starter');
        await repoUnload(
          'github.com/elastic/TypeScript-Node-Starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
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
          expect(await exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');
        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-Directory-src/models')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/models');
        // Then the 'models' folder on the file tree.
        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-File-src/models/User.ts')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-File-src/models/User.ts');
        // Then the 'User.ts' file on the file tree.
        await retry.try(async () => {
          expect(await exists('codeSourceViewer')).to.be(true);
        });

        // Hover on the 'UserModel' reference on line 5.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk32', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const userModelSpan = spans[0];
          expect(await userModelSpan.getVisibleText()).to.equal('UserModel');
          await userModelSpan.moveMouseTo();
          // Expect the go to definition button show up eventually.
          expect(await exists('codeFindReferenceButton')).to.be(true);

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
          expect(await exists('codeFileTreeNode-Directory-src')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src');
        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-Directory-src/controllers')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-Directory-src/controllers');
        // Then the 'controllers' folder on the file tree.
        await retry.try(async () => {
          expect(await exists('codeFileTreeNode-File-src/controllers/user.ts')).to.be(true);
        });

        await testSubjects.click('codeFileTreeNode-File-src/controllers/user.ts');
        // Then the 'user.ts' file on the file tree.
        await retry.try(async () => {
          expect(await exists('codeSourceViewer')).to.be(true);
        });

        // Hover on the 'async' reference on line 1.
        await retry.tryForTime(300000, async () => {
          const spans = await find.allByCssSelector('.mtk9', FIND_TIME);
          expect(spans.length).to.greaterThan(1);
          const asyncSpan = spans[1];
          expect(await asyncSpan.getVisibleText()).to.equal('async');
          await asyncSpan.moveMouseTo();
          // Expect the go to definition button show up eventually.
          expect(await exists('codeGoToDefinitionButton')).to.be(true);

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
          //   const $spans = await find.allByCssSelector('.mtk32', FIND_TIME);
          //   expect($spans.length).to.greaterThan(1);
          //   const $userModelSpan = $spans[1];
          //   expect(await $userModelSpan.getVisibleText()).to.equal('UserModel');
          // });
        });
      });
    });
  });
}
