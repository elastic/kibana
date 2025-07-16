/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SupertestWithRoleScopeType } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

import { createPlayground, deletePlayground } from './utils/create_playground';

const archivedBooksIndex = 'x-pack/test/functional_search/fixtures/search-books';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'searchPlayground',
    'solutionNavigation',
  ]);
  const log = getService('log');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esArchiver = getService('esArchiver');

  const createIndices = async () => {
    await esArchiver.load(archivedBooksIndex);
  };
  const deleteIndices = async () => {
    await esArchiver.unload(archivedBooksIndex);
  };

  describe('Search Playground - Saved Playgrounds', function () {
    let supertest: SupertestWithRoleScopeType;
    let testPlaygroundId: string;
    before(async () => {
      supertest = await roleScopedSupertest.getSupertestWithRoleScope('developer', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
      await createIndices();
      // Note: replace with creating playground via UI once thats supported
      testPlaygroundId = await createPlayground(
        {
          name: 'FTR Search Playground',
          indices: ['search-books'],
          queryFields: { 'search-books': ['name', 'author'] },
          elasticsearchQueryJSON: `{"retriever":{"standard":{"query":{"multi_match":{"query":"{query}","fields":["name","author"]}}}}}`,
        },
        { log, supertest }
      );

      await pageObjects.svlCommonPage.loginWithRole('developer');
    });
    after(async () => {
      if (testPlaygroundId) {
        await deletePlayground(testPlaygroundId, { log, supertest });
      }
      await deleteIndices();
    });
    describe('View a Saved Playground', function () {
      it('should open saved playground', async () => {
        expect(testPlaygroundId).not.to.be(undefined);

        await pageObjects.common.navigateToUrl('searchPlayground', `p/${testPlaygroundId}`, {
          shouldUseHashForSubUrl: false,
        });
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          'FTR Search Playground'
        );
        const { solutionNavigation } = pageObjects;
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Playground' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'FTR Search Playground',
        });
      });
      it('should be able to search index', async () => {
        // Should default to search mode for this playground
        await pageObjects.searchPlayground.expectPageModeToBeSelected('search');
        await pageObjects.searchPlayground.PlaygroundSearchPage.hasModeSelectors();
        // Preview mode enum shares data test subj with chat page mode
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectModeIsSelected('chatMode');

        await pageObjects.searchPlayground.PlaygroundSearchPage.expectSearchBarToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.executeSearchQuery('Neal');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectSearchResultsToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.executeSearchQuery('gibberish');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectSearchResultsNotToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.clearSearchInput();
      });
      it('should have query mode', async () => {
        await pageObjects.searchPlayground.PlaygroundSearchPage.selectPageMode(
          'queryMode',
          testPlaygroundId
        );
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeResultsEmptyState();
      });
      it('should support changing fields to search', async () => {
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('author');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('name');
        const queryEditorTextBefore =
          await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
        expect(queryEditorTextBefore).to.contain(`"author"`);
        expect(queryEditorTextBefore).to.contain('"name"');

        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', true);
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected('name');

        let queryEditorText =
          await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
        expect(queryEditorText).to.contain('"author"');
        expect(queryEditorText).not.to.contain('"name"');

        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', false);
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('name');
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', true);
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected(
          'author'
        );

        queryEditorText =
          await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
        expect(queryEditorText).not.to.contain('"author"');

        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', false);
      });
      it('should support running query in query mode', async () => {
        await pageObjects.searchPlayground.PlaygroundSearchPage.runQueryInQueryMode('atwood');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeResultsCodeEditor();
      });
    });
  });
}
