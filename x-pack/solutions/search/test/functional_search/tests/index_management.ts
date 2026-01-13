/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../ftr_provider_context';
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'searchIndexDetailsPage',
    'header',
    'common',
    'indexManagement',
  ]);
  const es = getService('es');
  const searchSpace = getService('searchSpace');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const indexName = 'index_mgmt_search_index';
  describe('Index management', function () {
    describe('Search solution nav', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };
      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'search-solution-nav-index-management-listpage-ftr'
        ));

        await es.indices.create({ index: indexName });
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await esDeleteAllIndices(indexName);
      });
      describe('Index list page', () => {
        beforeEach(async () => {
          // Navigate to search solution space
          await searchSpace.navigateTo(spaceCreated.id);
          // Navigate to index management app
          await pageObjects.common.navigateToApp('indexManagement', {
            basePath: `s/${spaceCreated.id}`,
          });
          // Navigate to the indices tab
          await pageObjects.indexManagement.changeTabs('indicesTab');
          await pageObjects.header.waitUntilLoadingHasFinished();
        });
        describe('manage index action', () => {
          beforeEach(async () => {
            await pageObjects.indexManagement.manageIndex(indexName);
            await pageObjects.indexManagement.manageIndexContextMenuExists();
          });
          it('navigates to overview tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
            await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('data');
          });

          it('navigates to settings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
            await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('settings');
          });
          it('navigates to mappings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
            await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('mappings');
          });
        });
        // FLAKY: https://github.com/elastic/kibana/issues/239152
        describe.skip('can view search index details', function () {
          it('renders search index details with no documents', async () => {
            await pageObjects.searchIndexDetailsPage.openIndicesDetailFromIndexManagementIndicesListTable(
              0
            );
            await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
            await pageObjects.searchIndexDetailsPage.expectSearchIndexDetailsTabsExists();
            await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkExists();
          });
        });
      });
    });
    describe('Classic Nav', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'classic-nav-index-management-listpage-ftr',
          'classic'
        ));

        await es.indices.create({ index: indexName });
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await esDeleteAllIndices(indexName);
      });
      describe('Index list page', () => {
        beforeEach(async () => {
          // Navigate to search solution space
          await searchSpace.navigateTo(spaceCreated.id);
          // Navigate to index management app
          await pageObjects.common.navigateToApp('indexManagement', {
            basePath: `s/${spaceCreated.id}`,
          });
          // Navigate to the indices tab
          await pageObjects.indexManagement.changeTabs('indicesTab');
          await pageObjects.header.waitUntilLoadingHasFinished();
        });
        after(async () => {
          await esDeleteAllIndices(indexName);
        });
        describe('manage index action', () => {
          beforeEach(async () => {
            await pageObjects.indexManagement.manageIndex(indexName);
            await pageObjects.indexManagement.manageIndexContextMenuExists();
          });
          it('navigates to overview tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
            await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
            await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('overview');
          });

          it('navigates to settings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
            await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
            await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('settings');
          });
          it('navigates to mappings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
            await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
            await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('mappings');
          });
        });
        describe('can view index management index details page', function () {
          it('navigates to the index management index details page from the home page', async () => {
            // display hidden indices to have some rows in the indices table
            await pageObjects.indexManagement.toggleHiddenIndices();
            // click the first index in the table and wait for the index details page
            await pageObjects.indexManagement.indexDetailsPage.openIndexDetailsPage(0);
            await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
            await pageObjects.indexManagement.indexDetailsPage.expectBreadcrumbNavigationToHaveBreadcrumbName(
              'Overview'
            );
          });
        });
      });
    });
  });
}
