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
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  describe('Manage Repositories', () => {
    const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';

    describe('Manage Repositories', () => {
      before(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
      // after(async () => await esArchiver.unload('code'));

      after(async () => {
        await PageObjects.security.logout();
      });

      it('import repository', async () => {
        log.debug('Code test import repository');
        // Fill in the import repository input box with a valid git repository url.
        await PageObjects.code.fillImportRepositoryUrlInputBox(
          'https://github.com/elastic/code-examples_empty-file'
        );
        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'elastic/code-examples_empty-file'
          );
        });

        // Wait for the index to start.
        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexOngoing')).to.be(true);
        });
        // Wait for the index to end.
        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexDone')).to.be(true);
        });
      });

      it('delete repository', async () => {
        log.debug('Code test delete repository');
        // Click the delete repository button.
        await PageObjects.code.clickDeleteRepositoryButton();

        await retry.try(async () => {
          expect(await testSubjects.exists('confirmModalConfirmButton')).to.be(true);
        });

        await testSubjects.click('confirmModalConfirmButton');

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(0);
        });
      });

      it('import a git:// repository', async () => {
        log.debug('Code test import repository');
        // Fill in the import repository input box with a valid git repository url.
        await PageObjects.code.fillImportRepositoryUrlInputBox(
          'git://github.com/elastic/code-examples_empty-file'
        );

        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'elastic/code-examples_empty-file'
          );
        });

        // Wait for the index to start.
        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexOngoing')).to.be(true);
        });
        // Wait for the index to end.
        await retry.try(async () => {
          expect(await testSubjects.exists('repositoryIndexDone')).to.be(true);
        });

        // Delete the repository
        await PageObjects.code.clickDeleteRepositoryButton();

        await retry.try(async () => {
          expect(await testSubjects.exists('confirmModalConfirmButton')).to.be(true);
        });

        await testSubjects.click('confirmModalConfirmButton');

        await retry.tryForTime(300000, async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(0);
        });
      });
    });
  });
}
