/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const {
    searchIndexDetail,
    common,
    searchApiKeys,
    searchNavigation,
    indexManagement,
    embeddedConsole,
  } = getPageObjects([
    'header',
    'searchIndexDetail',
    'common',
    'searchApiKeys',
    'searchNavigation',
    'indexManagement',
    'embeddedConsole',
  ]);
  const es = getService('es');
  const security = getService('security');
  const browser = getService('browser');
  const retry = getService('retry');
  const spaces = getService('spaces');

  const deleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';

  describe('index details page - search solution', function () {
    describe('developer rights', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        // Navigate to the spaces management page which will log us in Kibana
        await common.navigateToUrl('management', 'kibana/spaces', {
          shouldUseHashForSubUrl: false,
        });

        // Create a space with the search solution and navigate to its home page
        ({ cleanUp, space: spaceCreated } = await spaces.create({
          name: 'search-ftr',
          solution: 'es',
        }));
        await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await deleteAllIndices(indexName);
      });

      describe('search index details page', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await searchNavigation.navigateToIndexDetailPage(indexName);
        });
        after(async () => {
          await deleteAllIndices(indexName);
        });
        it('can load index detail page', async () => {
          await searchIndexDetail.expectIndexDetailPageHeader();
          await searchIndexDetail.expectSearchIndexDetailsTabsExists();
          await searchIndexDetail.expectAPIReferenceDocLinkExists();
          await searchIndexDetail.expectAPIReferenceDocLinkMissingInMoreOptions();
        });

        it('should have connection details', async () => {
          await searchIndexDetail.expectConnectionDetails();
        });

        describe('check code example texts', () => {
          const indexNameCodeExample = 'test-my-index2';
          before(async () => {
            await es.indices.create({ index: indexNameCodeExample });
            await searchNavigation.navigateToIndexDetailPage(indexNameCodeExample);
          });

          after(async () => {
            await deleteAllIndices(indexNameCodeExample);
          });

          it('should have embedded dev console', async () => {
            await testHasEmbeddedConsole({ embeddedConsole });
          });

          it('should have basic example texts', async () => {
            await searchIndexDetail.expectHasSampleDocuments();
          });

          it('should have other example texts when mapping changed', async () => {
            await es.indices.putMapping({
              index: indexNameCodeExample,
              properties: {
                text: { type: 'text' },
                number: { type: 'integer' },
              },
            });
            await searchIndexDetail.expectSampleDocumentsWithCustomMappings();
          });
        });

        describe('API key details', () => {
          it('should show api key', async () => {
            await searchApiKeys.deleteAPIKeys();
            await searchNavigation.navigateToIndexDetailPage(indexName);
            // sometimes the API key exists in the cluster and its lost in sessionStorage
            // if fails we retry to delete the API key and refresh the browser
            await retry.try(
              async () => {
                await searchApiKeys.expectAPIKeyExists();
              },
              async () => {
                await searchApiKeys.deleteAPIKeys();
                await browser.refresh();
              }
            );
            await searchApiKeys.expectAPIKeyAvailable();
            const apiKey = await searchApiKeys.getAPIKeyFromUI();
            await searchIndexDetail.expectAPIKeyToBeVisibleInCodeBlock(apiKey);
          });
        });

        it('should have quick stats', async () => {
          await searchIndexDetail.expectQuickStats();
          await searchIndexDetail.expectQuickStatsAIMappings();
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
          await searchNavigation.navigateToIndexDetailPage(indexName);
          await searchIndexDetail.expectQuickStatsAIMappingsToHaveVectorFields();
        });

        it('should show code examples for adding documents', async () => {
          await searchIndexDetail.expectAddDocumentCodeExamples();
          await searchIndexDetail.expectSelectedLanguage('python');
          await searchIndexDetail.codeSampleContainsValue('installCodeExample', 'pip install');
          await searchIndexDetail.selectCodingLanguage('javascript');
          await searchIndexDetail.codeSampleContainsValue('installCodeExample', 'npm install');
          await searchIndexDetail.selectCodingLanguage('curl');
          await searchIndexDetail.openConsoleCodeExample();
          await embeddedConsole.expectEmbeddedConsoleToBeOpen();
          await embeddedConsole.clickEmbeddedConsoleControlBar();
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
            await searchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('should have index documents', async () => {
            await searchIndexDetail.expectHasIndexDocuments();
          });
          it('menu action item should be replaced with playground', async () => {
            await searchIndexDetail.expectActionItemReplacedWhenHasDocs();
          });
          it('should have link to API reference doc link in options menu', async () => {
            await searchIndexDetail.clickMoreOptionsActionsButton();
            await searchIndexDetail.expectAPIReferenceDocLinkExistsInMoreOptions();
          });
          it('should have one document in quick stats', async () => {
            await searchIndexDetail.expectQuickStatsToHaveDocumentCount(1);
          });
          it('should have with data tabs', async () => {
            await searchIndexDetail.expectTabsExists();
            await searchIndexDetail.expectUrlShouldChangeTo('data');
          });
          it('should be able to change tabs to mappings and mappings is shown', async () => {
            await searchIndexDetail.changeTab('mappingsTab');
            await searchIndexDetail.expectUrlShouldChangeTo('mappings');
            await searchIndexDetail.expectMappingsComponentIsVisible();
          });
          it('should be able to change tabs to settings and settings is shown', async () => {
            await searchIndexDetail.changeTab('settingsTab');
            await searchIndexDetail.expectUrlShouldChangeTo('settings');
            await searchIndexDetail.expectSettingsComponentIsVisible();
          });
          it('should be able to delete document', async () => {
            await searchIndexDetail.changeTab('dataTab');
            await searchIndexDetail.clickFirstDocumentDeleteAction();
            await searchIndexDetail.expectAddDocumentCodeExamples();
            await searchIndexDetail.expectQuickStatsToHaveDocumentCount(0);
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
            await searchNavigation.navigateToIndexDetailPage(indexName);
          });

          beforeEach(async () => {
            await searchNavigation.navigateToIndexDetailPage(indexName);
          });

          it('delete document button is enabled', async () => {
            await searchIndexDetail.expectDeleteDocumentActionToBeEnabled();
          });
          it('add field button is enabled', async () => {
            await searchIndexDetail.changeTab('mappingsTab');
            await searchIndexDetail.expectAddFieldToBeEnabled();
          });
          it('edit settings button is enabled', async () => {
            await searchIndexDetail.changeTab('settingsTab');
            await searchIndexDetail.expectEditSettingsToBeEnabled();
          });
          it('delete index button is enabled', async () => {
            await searchIndexDetail.expectMoreOptionsActionButtonExists();
            await searchIndexDetail.clickMoreOptionsActionsButton();
            await searchIndexDetail.expectMoreOptionsOverviewMenuIsShown();
            await searchIndexDetail.expectDeleteIndexButtonExistsInMoreOptions();
            await searchIndexDetail.expectDeleteIndexButtonToBeEnabled();
          });
        });

        describe('page loading error', () => {
          before(async () => {
            await searchNavigation.navigateToIndexDetailPage(indexName);
            await deleteAllIndices(indexName);
          });
          it('has page load error section', async () => {
            await searchIndexDetail.expectPageLoadErrorExists();
            await searchIndexDetail.expectIndexNotFoundErrorExists();
          });
          it('reload button shows details page again', async () => {
            await es.indices.create({ index: indexName });
            await searchIndexDetail.clickPageReload();
            await searchIndexDetail.expectIndexDetailPageHeader();
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await searchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('shows action menu in actions popover', async () => {
            await searchIndexDetail.expectMoreOptionsActionButtonExists();
            await searchIndexDetail.clickMoreOptionsActionsButton();
            await searchIndexDetail.expectMoreOptionsOverviewMenuIsShown();
          });
          it('should delete index', async () => {
            await searchIndexDetail.expectDeleteIndexButtonExistsInMoreOptions();
            await searchIndexDetail.clickDeleteIndexButton();
            await searchIndexDetail.clickConfirmingDeleteIndex();
          });
        });
      });
      describe.skip('index management index list page', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await security.testUser.setRoles(['index_management_user']);
        });
        beforeEach(async () => {
          await searchNavigation.navigateToIndexManagementPage();
        });
        after(async () => {
          await deleteAllIndices(indexName);
        });
        describe('manage index action', () => {
          beforeEach(async () => {
            await indexManagement.manageIndex(indexName);
            await indexManagement.manageIndexContextMenuExists();
          });
          it('navigates to overview tab', async () => {
            await indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
            await searchIndexDetail.expectIndexDetailPageHeader();
            await searchIndexDetail.expectUrlShouldChangeTo('data');
          });

          it('navigates to settings tab', async () => {
            await indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
            await searchIndexDetail.expectIndexDetailPageHeader();
            await searchIndexDetail.expectUrlShouldChangeTo('settings');
          });
          it('navigates to mappings tab', async () => {
            await indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
            await searchIndexDetail.expectIndexDetailPageHeader();
            await searchIndexDetail.expectUrlShouldChangeTo('mappings');
          });
        });
        describe('can view search index details', function () {
          it('renders search index details with no documents', async () => {
            await searchIndexDetail.openIndicesDetailFromIndexManagementIndicesListTable(0);
            await searchIndexDetail.expectIndexDetailPageHeader();
            await searchIndexDetail.expectSearchIndexDetailsTabsExists();
            await searchIndexDetail.expectAPIReferenceDocLinkExists();
          });
        });
      });
    });
  });
}
