/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function importRepositoryFunctonalTests({
  getService,
  getPageObjects,
}: TestInvoker) {
  // const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  describe('Code', () => {
    const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';

    describe('Import Repository', () => {
      before(async () => {
        // Navigate to the code app.
        await PageObjects.common.navigateToApp('code');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
      // after(async () => await esArchiver.unload('code'));

      afterEach(async () => {
        await PageObjects.security.logout();
      });

      it('import repository', async () => {
        log.debug('Code test import repository');
        // Fill in the import repository input box with a valid git repository url.
        await PageObjects.code.fillImportRepositoryUrlInputBox();
        // Click the import repository button.
        await PageObjects.code.clickImportRepositoryButton();

        await retry.try(async () => {
          const repositoryItems = await testSubjects.findAll(repositoryListSelector);
          expect(repositoryItems).to.have.length(1);
          expect(await repositoryItems[0].getVisibleText()).to.equal(
            'Microsoft/TypeScript-Node-Starter'
          );
        });
      });
    });
  });
}
