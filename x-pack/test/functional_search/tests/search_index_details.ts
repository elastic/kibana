/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'embeddedConsole',
    'searchIndexDetailsPage',
    'searchApiKeys',
    'header',
    'common',
    'indexManagement',
    'searchNavigation',
  ]);
  const es = getService('es');
  const browser = getService('browser');
  const retry = getService('retry');
  const spaces = getService('spaces');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const indexName = 'test-my-index';

  // Failing: See https://github.com/elastic/kibana/issues/206396
  describe.skip('Search index details page', function () {
    describe('Solution Nav - Search', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        // Navigate to the spaces management page which will log us in Kibana
        await pageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          shouldUseHashForSubUrl: false,
        });

        // Create a space with the search solution and navigate to its home page
        ({ cleanUp, space: spaceCreated } = await spaces.create({
          name: 'search-ftr',
          solution: 'es',
        }));
        await pageObjects.searchApiKeys.deleteAPIKeys();
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await esDeleteAllIndices(indexName);
      });
      describe('search index details page', () => {
        before(async () => {
          // Navigate to the spaces management page which will log us in Kibana
          await pageObjects.searchApiKeys.deleteAPIKeys();
          await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
          await es.indices.create({ index: indexName });
          await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
        });
        after(async () => {
          await esDeleteAllIndices(indexName);
        });
        it('can load index detail page', async () => {
          await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
          await pageObjects.searchIndexDetailsPage.expectSearchIndexDetailsTabsExists();
          await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkExists();
          await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkMissingInMoreOptions();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });
        it('should have connection details', async () => {
          await pageObjects.searchIndexDetailsPage.expectConnectionDetails();
        });

        describe('check code example texts', () => {
          const indexNameCodeExample = 'test-my-index2';
          before(async () => {
            await es.indices.create({ index: indexNameCodeExample });
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexNameCodeExample);
          });

          after(async () => {
            await esDeleteAllIndices(indexNameCodeExample);
          });

          it('should have basic example texts', async () => {
            await pageObjects.searchIndexDetailsPage.expectHasSampleDocuments();
          });
        });

        describe('API key details', () => {
          it('should show api key', async () => {
            await pageObjects.searchApiKeys.deleteAPIKeys();
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
            // sometimes the API key exists in the cluster and its lost in sessionStorage
            // if fails we retry to delete the API key and refresh the browser
            await retry.try(
              async () => {
                await pageObjects.searchApiKeys.expectAPIKeyExists();
              },
              async () => {
                await pageObjects.searchApiKeys.deleteAPIKeys();
                await browser.refresh();
              }
            );
            await pageObjects.searchApiKeys.expectAPIKeyAvailable();
            const apiKey = await pageObjects.searchApiKeys.getAPIKeyFromUI();
            await pageObjects.searchIndexDetailsPage.expectAPIKeyToBeVisibleInCodeBlock(apiKey);
          });
        });

        it('should have quick stats', async () => {
          await pageObjects.searchIndexDetailsPage.expectQuickStats();
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStatus();
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStorage('227b');
          await pageObjects.searchIndexDetailsPage.expectQuickStatsAIMappings();
          await es.indices.putMapping({
            index: indexName,
            body: {
              properties: {
                my_field: {
                  type: 'dense_vector',
                  dims: 3,
                },
              },
            },
          });
          await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
          await pageObjects.searchIndexDetailsPage.expectQuickStatsAIMappingsToHaveVectorFields();
        });

        it('should show code examples for adding documents', async () => {
          await pageObjects.searchIndexDetailsPage.expectAddDocumentCodeExamples();
          await pageObjects.searchIndexDetailsPage.expectSelectedLanguage('python');
          await pageObjects.searchIndexDetailsPage.codeSampleContainsValue(
            'installCodeExample',
            'pip install'
          );
          await pageObjects.searchIndexDetailsPage.selectCodingLanguage('javascript');
          await pageObjects.searchIndexDetailsPage.codeSampleContainsValue(
            'installCodeExample',
            'npm install'
          );
          await pageObjects.searchIndexDetailsPage.selectCodingLanguage('curl');
          await pageObjects.searchIndexDetailsPage.openConsoleCodeExample();
          await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
          await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
        });

        describe('With data', () => {
          before(async () => {
            await es.index({
              index: indexName,
              refresh: true,
              body: {
                my_field: [1, 0, 1],
              },
            });
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('should have index documents', async () => {
            await pageObjects.searchIndexDetailsPage.expectHasIndexDocuments();
          });
          it('menu action item should be replaced with playground', async () => {
            await pageObjects.searchIndexDetailsPage.expectActionItemReplacedWhenHasDocs();
          });
          it('should have link to API reference doc link in options menu', async () => {
            await pageObjects.searchIndexDetailsPage.clickMoreOptionsActionsButton();
            await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkExistsInMoreOptions();
          });
          it('should have one document in quick stats', async () => {
            await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveDocumentCount(1);
          });
          it('should have with data tabs', async () => {
            await pageObjects.searchIndexDetailsPage.expectTabsExists();
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('data');
          });
          it('should be able to change tabs to mappings and mappings is shown', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('mappingsTab');
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('mappings');
            await pageObjects.searchIndexDetailsPage.expectMappingsComponentIsVisible();
          });
          it('should be able to change tabs to settings and settings is shown', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('settingsTab');
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('settings');
            await pageObjects.searchIndexDetailsPage.expectSettingsComponentIsVisible();
          });
          it('should be able to delete document', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('dataTab');
            await pageObjects.searchIndexDetailsPage.clickFirstDocumentDeleteAction();

            // re-open page to refresh queries for test (these will auto-refresh,
            // but waiting for that will make this test flakey)
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
            await pageObjects.searchIndexDetailsPage.expectAddDocumentCodeExamples();
            await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveDocumentCount(0);
          });
        });
        describe('has index actions enabled', () => {
          before(async () => {
            await es.index({
              index: indexName,
              body: {
                my_field: [1, 0, 1],
              },
            });
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
          });

          beforeEach(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
          });

          it('delete document button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.expectDeleteDocumentActionToBeEnabled();
          });
          it('add field button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('mappingsTab');
            await pageObjects.searchIndexDetailsPage.expectAddFieldToBeEnabled();
          });
          it('edit settings button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('settingsTab');
            await pageObjects.searchIndexDetailsPage.expectEditSettingsToBeEnabled();
          });
          it('delete index button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.expectMoreOptionsActionButtonExists();
            await pageObjects.searchIndexDetailsPage.clickMoreOptionsActionsButton();
            await pageObjects.searchIndexDetailsPage.expectMoreOptionsOverviewMenuIsShown();
            await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonExistsInMoreOptions();
            await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonToBeEnabled();
          });
        });

        describe('page loading error', () => {
          before(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
            await esDeleteAllIndices(indexName);
          });
          it('has page load error section', async () => {
            await pageObjects.searchIndexDetailsPage.expectPageLoadErrorExists();
            await pageObjects.searchIndexDetailsPage.expectIndexNotFoundErrorExists();
          });
          it('reload button shows details page again', async () => {
            await es.indices.create({ index: indexName });
            await pageObjects.searchIndexDetailsPage.clickPageReload();
            await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('shows action menu in actions popover', async () => {
            await pageObjects.searchIndexDetailsPage.expectMoreOptionsActionButtonExists();
            await pageObjects.searchIndexDetailsPage.clickMoreOptionsActionsButton();
            await pageObjects.searchIndexDetailsPage.expectMoreOptionsOverviewMenuIsShown();
          });
          it('should delete index', async () => {
            await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonExistsInMoreOptions();
            await pageObjects.searchIndexDetailsPage.clickDeleteIndexButton();
            await pageObjects.searchIndexDetailsPage.clickConfirmingDeleteIndex();
          });
        });
      });

      describe('index management index list page', () => {
        before(async () => {
          await esDeleteAllIndices(indexName);
          await es.indices.create({ index: indexName });
        });
        beforeEach(async () => {
          // Navigate to search solution space
          await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
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
        describe('can view search index details', function () {
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
        // Navigate to the spaces management page which will log us in Kibana
        await pageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          shouldUseHashForSubUrl: false,
        });

        // Create a space with the search solution and navigate to its home page
        ({ cleanUp, space: spaceCreated } = await spaces.create({
          name: 'classic-nav',
          solution: 'classic',
        }));
        await pageObjects.searchApiKeys.deleteAPIKeys();
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await esDeleteAllIndices(indexName);
      });
      describe('index management index list page', () => {
        before(async () => {
          await esDeleteAllIndices(indexName);
          await es.indices.create({ index: indexName });
        });
        beforeEach(async () => {
          // Navigate to search solution space
          await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
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
          });
        });
      });
    });
  });
}
