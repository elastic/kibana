/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import { createPlayground, deletePlayground } from './utils/create_playground';

const archivedBooksIndex = 'x-pack/test/functional_search/fixtures/search-books';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'searchPlayground', 'solutionNavigation']);
  const log = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const createIndices = async () => {
    await esArchiver.load(archivedBooksIndex);
  };
  const deleteIndices = async () => {
    await esArchiver.unload(archivedBooksIndex);
  };

  describe('Search Playground - Saved Playgrounds', function () {
    let testPlaygroundId: string;
    before(async () => {
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
    describe('Update Saved Playground', function () {
      before(async () => {
        expect(testPlaygroundId).not.to.be(undefined);

        await pageObjects.common.navigateToUrl('searchPlayground', `p/${testPlaygroundId}`, {
          shouldUseHashForSubUrl: false,
        });
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          'FTR Search Playground'
        );
      });
      it('should allow updating playground name', async () => {
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToExist();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickEditPlaygroundNameButton();
        await pageObjects.searchPlayground.SavedPlaygroundPage.setPlaygroundNameInEditModal(
          'Test Search Playground'
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.savePlaygroundNameInModal();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          'Test Search Playground'
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeEnabled();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickSavedPlaygroundSaveButton();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
      });
      it('should allow updating playground query fields', async () => {
        await pageObjects.searchPlayground.PlaygroundSearchPage.selectPageMode(
          'queryMode',
          testPlaygroundId
        );
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('author');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('name');
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', true);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeEnabled();
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', false);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
      });
    });
  });
}
