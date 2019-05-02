/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { TestInvoker } from './lib/types';

// eslint-disable-next-line import/no-default-export
export default function manageRepositoriesFunctionalTests({
  getService,
  getPageObjects,
}: TestInvoker) {
  // const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const config = getService('config');
  const FIND_TIME = config.get('timeouts.find');
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  describe('History', () => {
    const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';

    describe('browser history can go back while exploring code app', () => {
      let driver: any;
      before(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        log.debug('Code test import repository');
        // Fill in the import repository input box with a valid git repository url.
        await PageObjects.code.fillImportRepositoryUrlInputBox(
          'https://github.com/Microsoft/TypeScript-Node-Starter'
        );
        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        const webDriver = await getService('__webdriver__').init();
        driver = webDriver.driver;
      });
      // after(async () => await esArchiver.unload('code'));

      after(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();

        // Clean up the imported repository
        await PageObjects.code.clickDeleteRepositoryButton();
        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(0);
        });

        await PageObjects.security.logout();
      });

      it('from admin page to source view page can go back and forward', async () => {
        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'Microsoft/TypeScript-Node-Starter'
          );
        });

        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexDone')).to.be(true);

          log.debug('it goes to Microsoft/TypeScript-Node-Starter project page');
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
              'Microsoft/TypeScript-Node-Starter'
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
        const url = `${PageObjects.common.getHostPort()}/app/code#/search?q=string&p=&langs=typescript`;
        await browser.get(url);

        const language = await (await find.byCssSelector(
          '.euiFacetButton--isSelected'
        )).getVisibleText();

        expect(language.indexOf('typescript')).to.equal(0);

        const unselectedFilter = (await find.allByCssSelector('.euiFacetButton--unSelected'))[1];
        await unselectedFilter.click();

        const l = await (await find.allByCssSelector(
          '.euiFacetButton--isSelected'
        ))[1].getVisibleText();

        expect(l.indexOf('javascript')).to.equal(0);

        await browser.goBack();

        const lang = await (await find.byCssSelector(
          '.euiFacetButton--isSelected'
        )).getVisibleText();

        expect(lang.indexOf('typescript')).to.equal(0);

        await driver.navigate().forward();

        const filter = await (await find.allByCssSelector(
          '.euiFacetButton--isSelected'
        ))[1].getVisibleText();

        expect(filter.indexOf('javascript')).to.equal(0);
      });

      it('in source view page file line number changed can go back and forward', async () => {
        log.debug('it goes back after line number changed');
        const url = `${PageObjects.common.getHostPort()}/app/code#/github.com/Microsoft/TypeScript-Node-Starter`;
        await browser.get(url);
        const lineNumber = 20;
        await testSubjects.click('codeFileTreeNode-File-package.json');
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
        const url = `${PageObjects.common.getHostPort()}/app/code#/github.com/Microsoft/TypeScript-Node-Starter/blob/master/src/controllers/api.ts`;
        await browser.get(url);
        // refresh so language server will be initialized.
        await browser.refresh();
        // wait for tab is not disabled
        await PageObjects.common.sleep(5000);
        await testSubjects.click('codeStructureTreeTab');
        await retry.try(async () => {
          const tabText = await (await find.byCssSelector('.euiTab-isSelected')).getVisibleText();
          expect(tabText).to.equal('Structure');
        });

        await browser.goBack();

        await retry.try(async () => {
          const tabText = await (await find.byCssSelector('.euiTab-isSelected')).getVisibleText();
          expect(tabText).to.equal('File');
        });

        await driver.navigate().forward();

        await retry.try(async () => {
          const tabText = await (await find.byCssSelector('.euiTab-isSelected')).getVisibleText();
          expect(tabText).to.equal('Structure');
        });
      });
    });
  });
}
