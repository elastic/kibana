/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { REPO_ROOT } from '@kbn/dev-utils';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { load as repoLoad, unload as repoUnload } from './repo_archiver';

export default function manageRepositoriesFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const config = getService('config');
  const FIND_TIME = config.get('timeouts.find');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  const existsInvisible = async (selector: string) =>
    await testSubjects.exists(selector, { allowHidden: true });

  describe('History', function() {
    this.tags('smoke');
    const repositoryListSelector = 'codeRepositoryList > codeRepositoryItem';

    describe('browser history can go back while exploring code app', () => {
      let driver: any;
      before(async () => {
        await repoLoad(
          'github.com/elastic/TypeScript-Node-Starter',
          'typescript_node_starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
        await esArchiver.load('code/repositories/typescript_node_starter');

        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        const webDriver = await getService('__webdriver__').init();
        driver = webDriver.driver;
      });

      after(async () => {
        await PageObjects.security.logout();
        await esArchiver.unload('code/repositories/typescript_node_starter');
        await repoUnload(
          'github.com/elastic/TypeScript-Node-Starter',
          config.get('kbnTestServer.installDir') || REPO_ROOT
        );
      });

      it('from admin page to source view page can go back and forward', async () => {
        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'elastic/TypeScript-Node-Starter'
          );
        });

        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexDone')).to.be(true);

          log.debug('it goes to elastic/TypeScript-Node-Starter project page');
          await testSubjects.click('adminLinkToTypeScript-Node-Starter');
          await retry.try(async () => {
            expect(await testSubjects.exists('codeStructureTreeTab')).to.be(true);
          });

          // can go back to admin page
          await browser.goBack();

          await retry.tryForTime(300000, async () => {
            const repositoryItems = await testSubjects.findAll(repositoryListSelector);
            expect(repositoryItems).to.have.length(1);
            expect(await repositoryItems[0].getVisibleText()).to.equal(
              'elastic/TypeScript-Node-Starter'
            );
          });

          // can go forward to source view page
          await driver.navigate().forward();

          await retry.try(async () => {
            expect(await testSubjects.exists('codeStructureTreeTab')).to.be(true);
          });
        });
      });

      it('from source view page to search page can go back and forward', async () => {
        log.debug('it search a symbol');
        await queryBar.setQuery('user');
        await queryBar.submitQuery();
        await retry.try(async () => {
          const searchResultListSelector = 'codeSearchResultList codeSearchResultFileItem';
          const results = await testSubjects.findAll(searchResultListSelector);
          expect(results).to.be.ok();
        });
        log.debug('it goes back to project page');
        await browser.goBack();
        retry.try(async () => {
          expect(await testSubjects.exists('codeStructureTreeTab')).to.be(true);
        });

        await driver.navigate().forward();

        await retry.try(async () => {
          const searchResultListSelector = 'codeSearchResultList codeSearchResultFileItem';
          const results = await testSubjects.findAll(searchResultListSelector);
          expect(results).to.be.ok();
        });
      });

      it('in search page, change language filters can go back and forward', async () => {
        log.debug('it select typescript language filter');
        const url = `${PageObjects.common.getHostPort()}/app/code#/search?q=string&langs=typescript`;
        await browser.get(url);

        await PageObjects.header.awaitKibanaChrome();

        await retry.tryForTime(300000, async () => {
          const language = await (await find.byCssSelector(
            '.euiFacetButton--isSelected'
          )).getVisibleText();

          expect(language.indexOf('typescript')).to.equal(0);
        });

        const unselectedFilter = (await find.allByCssSelector('.euiFacetButton--unSelected'))[1];
        await unselectedFilter.click();

        await retry.try(async () => {
          const l = await (await find.allByCssSelector(
            '.euiFacetButton--isSelected'
          ))[1].getVisibleText();

          expect(l.indexOf('javascript')).to.equal(0);
        });

        await browser.goBack();

        await retry.try(async () => {
          const lang = await (await find.byCssSelector(
            '.euiFacetButton--isSelected'
          )).getVisibleText();

          expect(lang.indexOf('typescript')).to.equal(0);
        });

        await driver.navigate().forward();

        await retry.try(async () => {
          const filter = await (await find.allByCssSelector(
            '.euiFacetButton--isSelected'
          ))[1].getVisibleText();

          expect(filter.indexOf('javascript')).to.equal(0);
        });
      });

      it('in source view page file line number changed can go back and forward', async () => {
        log.debug('it goes back after line number changed');
        const url = `${PageObjects.common.getHostPort()}/app/code#/github.com/elastic/TypeScript-Node-Starter`;
        await browser.get(url);
        await PageObjects.header.awaitKibanaChrome();

        const lineNumber = 20;
        await retry.try(async () => {
          const existence = await existsInvisible('codeFileTreeNode-File-tsconfig.json');
          expect(existence).to.be(true);
        });
        await testSubjects.click('codeFileTreeNode-File-tsconfig.json');
        await retry.try(async () => {
          const existence = await existsInvisible('codeFileTreeNode-File-package.json');
          expect(existence).to.be(true);
        });
        await testSubjects.click('codeFileTreeNode-File-package.json');

        await retry.try(async () => {
          const currentUrl: string = await browser.getCurrentUrl();
          // click line number should stay in the same file
          expect(currentUrl.indexOf('package.json')).greaterThan(0);
        });

        const lineNumberElements = await find.allByCssSelector('.line-numbers');
        await lineNumberElements[lineNumber].click();

        await retry.try(async () => {
          const existence = await find.existsByCssSelector('.code-line-number-21', FIND_TIME);
          expect(existence).to.be(true);
        });

        await browser.goBack();

        await retry.try(async () => {
          const existence = await find.existsByCssSelector('.code-line-number-21', FIND_TIME);
          expect(existence).to.be(false);
        });

        await driver.navigate().forward();

        await retry.try(async () => {
          const existence = await find.existsByCssSelector('.code-line-number-21', FIND_TIME);
          expect(existence).to.be(true);
        });
      });

      it('in source view page, switch side tab can go back and forward', async () => {
        log.debug('it goes back after line number changed');
        const url = `${PageObjects.common.getHostPort()}/app/code#/github.com/elastic/TypeScript-Node-Starter/blob/master/src/controllers/api.ts`;
        await browser.get(url);
        // refresh so language server will be initialized.
        await browser.refresh();

        await PageObjects.header.awaitKibanaChrome();

        // wait for tab is not disabled
        await PageObjects.common.sleep(5000);
        await testSubjects.click('codeStructureTreeTab');
        await retry.try(async () => {
          // if structure tree tab is active, file tree tab's `data-test-subj` would be `codeFileTreeTab`
          expect(testSubjects.exists('codeFileTreeTab')).to.be.ok();
        });

        await browser.goBack();

        await retry.try(async () => {
          // if file tree tab is active, file tree tab's `data-test-subj` would be `codeFileTreeTabActive`
          expect(testSubjects.exists('codeFileTreeTabActive')).to.be.ok();
        });

        await driver.navigate().forward();

        await retry.try(async () => {
          // if structure tree tab is active, file tree tab's `data-test-subj` would be `codeFileTreeTab`
          expect(testSubjects.exists('codeFileTreeTab')).to.be.ok();
        });
      });
    });
  });
}
