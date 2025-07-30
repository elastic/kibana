/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ARCHIVE_INDEX_NAME = 'search-playground-books';
const esArchiveIndex =
  'x-pack/test_serverless/functional/test_suites/search/fixtures/playground_books';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'searchPlayground',
    'embeddedConsole',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const createIndex = async () => await esArchiver.load(esArchiveIndex);

  describe('Serverless Search Relevance Playground', function () {
    before(async () => {
      await createIndex();
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await pageObjects.searchPlayground.session.clearSession();
      await svlSearchNavigation.navigateToSearchPlayground();
    });

    after(async () => {
      await esArchiver.unload(esArchiveIndex);
    });

    it('should be able to navigate to the search relevance playground', async () => {
      await pageObjects.searchPlayground.expectPageSelectorToExist();
      // playground defaults to chat mode
      await pageObjects.searchPlayground.expectPageModeToBeSelected('chat');
      await pageObjects.searchPlayground.selectPageMode('search');
      expect(await browser.getCurrentUrl()).contain('/app/search_playground/search');
    });
    it('should start with setup page', async () => {
      await pageObjects.searchPlayground.PlaygroundStartSearchPage.expectPlaygroundStartSearchPageComponentsToExist();
      await pageObjects.searchPlayground.PlaygroundStartSearchPage.expectToSelectIndicesAndLoadSearch(
        ARCHIVE_INDEX_NAME
      );
    });
    it('should be able to search index', async () => {
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
      await pageObjects.searchPlayground.PlaygroundSearchPage.selectPageMode('queryMode');
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeComponentsToExist();
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeResultsEmptyState();
    });
    it('should support changing fields to search', async () => {
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('author');
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected('name');
      const queryEditorTextBefore =
        await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
      expect(queryEditorTextBefore).to.contain(`"author"`);
      expect(queryEditorTextBefore).not.to.contain('"name"');

      await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', false);
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('name');

      let queryEditorText =
        await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
      expect(queryEditorText).to.contain('"author"');
      expect(queryEditorText).to.contain('"name"');

      await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', true);
      await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected('author');

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
}
