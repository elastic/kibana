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
  // FLAKY: https://github.com/elastic/kibana/issues/44576
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

      const symbolLangAggs = await esSupertest
        .post('/.code-symbol-github.com-elastic-code-examples_smoke-19c9057c-1/_search')
        .send({
          query: {
            match_all: {},
          },
          aggs: {
            language: {
              terms: {
                script: {
                  // Aggregate results based on the source file's extension.
                  source:
                    "doc['symbolInformation.location.uri'].value.substring(doc['symbolInformation.location.uri'].value.lastIndexOf('.'))",
                  lang: 'painless',
                },
              },
            },
          },
        })
        .expect(200)
        .then((res: any) => res.body);

      // Symbol's source file extension aggregations
      expect(JSON.stringify(symbolLangAggs.aggregations.language.buckets.sort())).to.equal(
        JSON.stringify(
          [
            {
              key: '.java',
              doc_count: 3,
            },
            {
              key: '.py',
              doc_count: 2,
            },
            {
              key: '.ts',
              doc_count: 2,
            },
          ].sort()
        )
      );
      expect(symbolLangAggs.hits.total.value).to.equal(7);

      const referenceCount = await esSupertest
        .get('/.code-reference-github.com-elastic-code-examples_smoke-19c9057c-1/_count')
        .expect(200)
        .then((res: any) => res.body);

      expect(referenceCount.count).to.equal(0);
    });
  });
}
