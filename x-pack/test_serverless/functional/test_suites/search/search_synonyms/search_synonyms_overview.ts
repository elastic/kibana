/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SynonymsGetSynonymResponse } from '@elastic/elasticsearch/lib/api/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchSynonyms',
    'embeddedConsole',
    'common',
  ]);
  const browser = getService('browser');
  const es = getService('es');

  describe('Serverless Synonyms Overview', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });
    beforeEach(async () => {
      await pageObjects.svlCommonNavigation.sidenav.clickLink({
        deepLinkId: 'searchSynonyms',
      });
    });
    describe('Synonyms get started Page', () => {
      it('is loaded successfully', async () => {
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.expectSynonymsGetStartedPageComponentsToExist();
      });
      it('should be able to create a new test synonyms set', async () => {
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickCreateSynonymsSetButton();
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.setSynonymsSetName('test-synonyms');
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickSaveButton();
        // Verify that the synonyms set detail page is displayed
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.expectSynonymsSetDetailPageNavigated(
          'test-synonyms'
        );
        await es.transport.request({
          path: '_synonyms/test-synonyms',
          method: 'DELETE',
        });
      });
      it('should not override existing synonyms set unless specified', async () => {
        await es.transport.request({
          path: '_synonyms/overwrite-test',
          method: 'PUT',
          body: {
            synonyms_set: [
              {
                id: 'rule1',
                synonyms: 'a, b, c',
              },
            ],
          },
        });

        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickCreateSynonymsSetButton();
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.setSynonymsSetName(
          'overwrite-test'
        );
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickSaveButton();
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickOverwriteCheckbox();
        await pageObjects.searchSynonyms.SynonymsGetStartedPage.clickSaveButton();
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.expectSynonymsSetDetailPageNavigated(
          'overwrite-test'
        );
        const overwrittenSet: SynonymsGetSynonymResponse = await es.transport.request({
          path: '_synonyms/overwrite-test',
          method: 'GET',
        });
        expect(overwrittenSet.synonyms_set).to.eql([]);
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.expectEmptyPromptToExist();

        await es.transport.request({
          path: '_synonyms/overwrite-test',
          method: 'DELETE',
        });
      });
    });

    describe('synonyms sets list page', () => {
      before(async () => {
        await es.transport.request({
          path: '_synonyms/test',
          method: 'PUT',
          body: {
            synonyms_set: [
              {
                id: 'rule1',
                synonyms: 'a, b, c',
              },
              {
                id: 'rule2',
                synonyms: 'd, e, f => g, h, i',
              },
            ],
          },
        });

        await es.transport.request({
          path: '_synonyms/test2',
          method: 'PUT',
          body: {
            synonyms_set: [
              {
                id: 'rule3',
                synonyms: 'gray, grey',
              },
            ],
          },
        });
      });
      it('loads successfully', async () => {
        await browser.refresh();
        await pageObjects.searchSynonyms.SynonymsSetsListPage.expectSynonymsSetsListPageComponentsToExist();

        const synonymsSets =
          await pageObjects.searchSynonyms.SynonymsSetsListPage.getSynonymsSetsList();
        expect(synonymsSets).to.eql([
          { name: 'test', ruleCount: 2 },
          { name: 'test2', ruleCount: 1 },
        ]);
      });
      it('navigates to synonyms set detail page', async () => {
        await pageObjects.searchSynonyms.SynonymsSetsListPage.clickSynonymsSet('test');
        await pageObjects.searchSynonyms.SynonymsSetDetailPage.expectSynonymsSetDetailPageNavigated(
          'test'
        );
      });
      after(async () => {
        await es.transport.request({
          path: '_synonyms/test',
          method: 'DELETE',
        });

        await es.transport.request({
          path: '_synonyms/test2',
          method: 'DELETE',
        });
      });
    });
    describe('synonyms set pagination', () => {
      before(async () => {
        for (let i = 1; i <= 26; i++) {
          await es.transport.request({
            path: `_synonyms/test-${String.fromCharCode(96 + i)}`,
            method: 'PUT',
            body: {
              synonyms_set: [
                {
                  id: `rule`,
                  synonyms: `a, b, c`,
                },
              ],
            },
          });
        }
      });
      it('navigates correctly', async () => {
        await browser.refresh();
        let synonymsSets =
          await pageObjects.searchSynonyms.SynonymsSetsListPage.getSynonymsSetsList();
        // check the first 25 synonyms sets, names are lexically ordered
        for (let i = 1; i < 26; i++) {
          expect(synonymsSets[i - 1]).to.eql({
            name: `test-${String.fromCharCode(96 + i)}`,
            ruleCount: 1,
          });
        }

        await pageObjects.searchSynonyms.SynonymsSetsListPage.clickPaginationNext();
        synonymsSets = await pageObjects.searchSynonyms.SynonymsSetsListPage.getSynonymsSetsList();
        // Second page should have only one synonyms set
        expect(synonymsSets).to.eql([{ name: 'test-z', ruleCount: 1 }]);

        await pageObjects.searchSynonyms.SynonymsSetsListPage.clickPaginationPrevious();
        // get list of synonyms sets and check
        synonymsSets = await pageObjects.searchSynonyms.SynonymsSetsListPage.getSynonymsSetsList();
        for (let i = 1; i < 26; i++) {
          expect(synonymsSets[i - 1]).to.eql({
            name: `test-${String.fromCharCode(96 + i)}`,
            ruleCount: 1,
          });
        }
      });
      after(async () => {
        for (let i = 1; i <= 26; i++) {
          await es.transport.request({
            path: `_synonyms/test-${String.fromCharCode(96 + i)}`,
            method: 'DELETE',
          });
        }
      });
    });
  });
}
