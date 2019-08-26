/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function langServerCoverageFunctionalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const esSupertest = getService('esSupertest');
  const PageObjects = getPageObjects(['common', 'header', 'security', 'code', 'home']);

  // Use https://github.com/elastic/code-examples_smoke repository to smoke test
  // all language servers.
  describe('Lang Server Coverage', () => {
    const repositoryListSelector = 'codeRepositoryList codeRepositoryItem';
    before(async () => {
      // Navigate to the code app.
      await PageObjects.common.navigateToApp('code');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // Prepare a git repository for the test
      await PageObjects.code.fillImportRepositoryUrlInputBox(
        'https://github.com/elastic/code-examples_smoke'
      );
      // Click the import repository button.
      await PageObjects.code.clickImportRepositoryButton();

      await retry.tryForTime(300000, async () => {
        const repositoryItems = await testSubjects.findAll(repositoryListSelector);
        expect(repositoryItems).to.have.length(1);
        expect(await repositoryItems[0].getVisibleText()).to.equal('elastic/code-examples_smoke');

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

    it('Verify the symbol/referernces object counts in Elasticsearch', async () => {
      // Make sure the indexes exist.
      await esSupertest
        .head('/.code-symbol-github.com-elastic-code-examples_smoke-19c9057c-1')
        .expect(200);
      await esSupertest
        .head('/.code-reference-github.com-elastic-code-examples_smoke-19c9057c-1')
        .expect(200);

      await esSupertest
        .get('/.code-symbol-github.com-elastic-code-examples_smoke-19c9057c-1/_count')
        .expect(200, {
          count: 7,
          _shards: {
            failed: 0,
            skipped: 0,
            successful: 1,
            total: 1,
          },
        });
      await esSupertest
        .get('/.code-reference-github.com-elastic-code-examples_smoke-19c9057c-1/_count')
        .expect(200, {
          count: 0,
          _shards: {
            failed: 0,
            skipped: 0,
            successful: 1,
            total: 1,
          },
        });
    });
  });
}
