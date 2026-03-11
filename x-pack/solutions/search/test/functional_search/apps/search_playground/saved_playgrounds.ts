/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const archivedBooksIndex = 'x-pack/solutions/search/test/functional_search/fixtures/search-books';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'searchPlayground', 'solutionNavigation']);
  const esArchiver = getService('esArchiver');

  const createIndices = async () => {
    await esArchiver.load(archivedBooksIndex);
  };
  const deleteIndices = async () => {
    await esArchiver.unload(archivedBooksIndex);
  };
  const openaiConnectorName = 'test-openai-connector';
  const testPlaygroundName = 'FTR Search Playground';
  const updatedPlaygroundName = 'Test Search Playground';

  // Failing: See https://github.com/elastic/kibana/issues/237715
  describe.skip('Saved Playgrounds', function () {
    before(async () => {
      await createIndices();
    });
    after(async () => {
      try {
        await pageObjects.common.navigateToApp('connectors');
        await pageObjects.searchPlayground.PlaygroundStartChatPage.deleteConnector(
          openaiConnectorName
        );
      } catch {
        // we can ignore  if this fails
      }
      await deleteIndices();
    });

    describe('Create a Saved Playground', function () {
      it('should allow saving playground', async () => {
        await pageObjects.common.navigateToUrl('searchPlayground');

        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.expectDeprecationNoticeToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.clickNewPlaygroundButton();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectPlaygroundSetupPage();
        // Add a connector to the playground
        await pageObjects.searchPlayground.PlaygroundStartChatPage.clickConnectLLMButton();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.createConnectorFlyoutIsVisible();
        await pageObjects.searchPlayground.PlaygroundStartChatPage.createOpenAiConnector(
          openaiConnectorName
        );
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectAndCloseSuccessLLMText();

        // Select indices
        await pageObjects.searchPlayground.PlaygroundStartChatPage.expectToSelectIndicesAndLoadChat();

        // Select created openai connector
        await pageObjects.searchPlayground.PlaygroundChatPage.selectConnector(openaiConnectorName);
        await pageObjects.searchPlayground.PlaygroundChatPage.expectSaveButtonToExist();
        await pageObjects.searchPlayground.PlaygroundChatPage.expectSaveButtonToBeEnabled();
        await pageObjects.searchPlayground.PlaygroundChatPage.savePlayground(testPlaygroundName);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectAndCloseSavedPlaygroundToast();
      });
    });

    describe('View a Saved Playground', function () {
      it('should open saved playground', async () => {
        await pageObjects.common.navigateToUrl('searchPlayground');

        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.openPlaygroundFromTableByName(
          testPlaygroundName
        );

        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          testPlaygroundName
        );
        const { solutionNavigation } = pageObjects;
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Playground' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: testPlaygroundName,
        });
      });
      it.skip('should be able to search index', async () => {
        await pageObjects.searchPlayground.expectPageModeToBeSelected('chat');
        await pageObjects.searchPlayground.selectPageMode('search');
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

        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', true);
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected('name');
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', true);
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected(
          'author'
        );

        queryEditorText =
          await pageObjects.searchPlayground.PlaygroundSearchPage.getQueryEditorText();
        expect(queryEditorText).not.to.contain('"author"');

        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();

        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('author', false);
      });
      it('should support running query in query mode', async () => {
        await pageObjects.searchPlayground.PlaygroundChatPage.runQueryInQueryMode('atwood');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeResultsCodeEditor();
      });
    });
    describe('Update Saved Playground', function () {
      before(async () => {
        await pageObjects.common.navigateToUrl('searchPlayground');
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.openPlaygroundFromTableByName(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          testPlaygroundName
        );
      });
      it('should allow updating playground name', async () => {
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToExist();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickEditPlaygroundNameButton();
        await pageObjects.searchPlayground.SavedPlaygroundPage.setPlaygroundNameInEditModal(
          updatedPlaygroundName
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.savePlaygroundNameInModal();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          updatedPlaygroundName
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeEnabled();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickSavedPlaygroundSaveButton();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
      });
      it('should allow updating playground query fields', async () => {
        await pageObjects.searchPlayground.PlaygroundSearchPage.selectPageMode('queryMode');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectQueryModeComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldToBeSelected('author');
        await pageObjects.searchPlayground.PlaygroundSearchPage.expectFieldNotToBeSelected('name');
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', false);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeEnabled();
        await pageObjects.searchPlayground.PlaygroundSearchPage.clickFieldSwitch('name', true);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectUnSavedChangesBadegeNotExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundButtonToBeDisabled();
      });
      it('should allow copying playground', async () => {
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundOptionsExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.openSavedPlaygroundOptions();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundSaveAsOptionExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickPlaygroundSaveAsOption();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundSaveAsModalExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.savePlaygroundAs(testPlaygroundName);
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectAndCloseSavedPlaygroundToast();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          testPlaygroundName
        );

        await pageObjects.common.navigateToUrl('searchPlayground');
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          updatedPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.openPlaygroundFromTableByName(
          testPlaygroundName
        );
      });
    });
    describe('Delete Saved Playground', function () {
      it('should allow deleting playground from the playground page', async () => {
        await pageObjects.common.navigateToUrl('searchPlayground');
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.openPlaygroundFromTableByName(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundNameHeader(
          testPlaygroundName
        );
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectSavedPlaygroundOptionsExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.openSavedPlaygroundOptions();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectPlaygroundDeleteOptionExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.clickPlaygroundDeleteOption();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectDeletePlaygroundModalExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.confirmDeletePlaygroundInModal();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundNotToExistInTable(
          testPlaygroundName
        );
      });
      it('should allow deleting playground from playground list page', async () => {
        await pageObjects.common.navigateToUrl('searchPlayground');
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundListPageComponentsToExist();
        await pageObjects.searchPlayground.PlaygroundListPage.expectPlaygroundToExistInTable(
          updatedPlaygroundName
        );
        await pageObjects.searchPlayground.PlaygroundListPage.clickPlaygroundDeleteTableAction();
        await pageObjects.searchPlayground.SavedPlaygroundPage.expectDeletePlaygroundModalExists();
        await pageObjects.searchPlayground.SavedPlaygroundPage.confirmDeletePlaygroundInModal();
      });
    });
  });
}
