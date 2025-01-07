/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'svlSearchIndexDetailPage',
    'svlApiKeys',
    'header',
    'common',
    'indexManagement',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const es = getService('es');
  const security = getService('security');
  const browser = getService('browser');
  const retry = getService('retry');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';

  describe('index details page - search solution', function () {
    describe('developer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginWithRole('developer');
        await pageObjects.svlApiKeys.deleteAPIKeys();
      });
      after(async () => {
        await esDeleteAllIndices(indexName);
      });
      describe('search index details page', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
        });
        after(async () => {
          await esDeleteAllIndices(indexName);
        });
        it('can load index detail page', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
          await pageObjects.svlSearchIndexDetailPage.expectSearchIndexDetailsTabsExists();
          await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkExists();
          await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkMissingInMoreOptions();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });
        it('should have connection details', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectConnectionDetails();
        });

        describe('check code example texts', () => {
          const indexNameCodeExample = 'test-my-index2';
          before(async () => {
            await es.indices.create({ index: indexNameCodeExample });
            await svlSearchNavigation.navigateToIndexDetailPage(indexNameCodeExample);
          });

          after(async () => {
            await esDeleteAllIndices(indexNameCodeExample);
          });

          it('should have basic example texts', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectHasSampleDocuments();
          });

          it('should have other example texts when mapping changed', async () => {
            await es.indices.putMapping({
              index: indexNameCodeExample,
              properties: {
                text: { type: 'text' },
                number: { type: 'integer' },
              },
            });
            await pageObjects.svlSearchIndexDetailPage.expectSampleDocumentsWithCustomMappings();
          });
        });

        describe('API key details', () => {
          it('should show api key', async () => {
            await pageObjects.svlApiKeys.deleteAPIKeys();
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
            // sometimes the API key exists in the cluster and its lost in sessionStorage
            // if fails we retry to delete the API key and refresh the browser
            await retry.try(
              async () => {
                await pageObjects.svlApiKeys.expectAPIKeyExists();
              },
              async () => {
                await pageObjects.svlApiKeys.deleteAPIKeys();
                await browser.refresh();
              }
            );
            await pageObjects.svlApiKeys.expectAPIKeyAvailable();
            const apiKey = await pageObjects.svlApiKeys.getAPIKeyFromUI();
            await pageObjects.svlSearchIndexDetailPage.expectAPIKeyToBeVisibleInCodeBlock(apiKey);
          });
        });

        it('should have quick stats', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectQuickStats();
          await pageObjects.svlSearchIndexDetailPage.expectQuickStatsAIMappings();
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
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          await pageObjects.svlSearchIndexDetailPage.expectQuickStatsAIMappingsToHaveVectorFields();
        });

        it('should have breadcrumb navigation', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectBreadcrumbNavigationWithIndexName(
            indexName
          );
          await pageObjects.svlSearchIndexDetailPage.clickOnIndexManagementBreadcrumb();
          await pageObjects.indexManagement.expectToBeOnIndicesManagement();
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
        });

        it('should show code examples for adding documents', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectAddDocumentCodeExamples();
          await pageObjects.svlSearchIndexDetailPage.expectSelectedLanguage('python');
          await pageObjects.svlSearchIndexDetailPage.codeSampleContainsValue(
            'installCodeExample',
            'pip install'
          );
          await pageObjects.svlSearchIndexDetailPage.selectCodingLanguage('javascript');
          await pageObjects.svlSearchIndexDetailPage.codeSampleContainsValue(
            'installCodeExample',
            'npm install'
          );
          await pageObjects.svlSearchIndexDetailPage.selectCodingLanguage('curl');
          await pageObjects.svlSearchIndexDetailPage.openConsoleCodeExample();
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
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('should have index documents', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectHasIndexDocuments();
          });
          it('menu action item should be replaced with playground', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectActionItemReplacedWhenHasDocs();
          });
          it('should have link to API reference doc link in options menu', async () => {
            await pageObjects.svlSearchIndexDetailPage.clickMoreOptionsActionsButton();
            await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkExistsInMoreOptions();
          });
          it('should have one document in quick stats', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectQuickStatsToHaveDocumentCount(1);
          });
          it('should have with data tabs', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectTabsExists();
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('data');
          });
          it('should be able to change tabs to mappings and mappings is shown', async () => {
            await pageObjects.svlSearchIndexDetailPage.changeTab('mappingsTab');
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('mappings');
            await pageObjects.svlSearchIndexDetailPage.expectMappingsComponentIsVisible();
          });
          it('should be able to change tabs to settings and settings is shown', async () => {
            await pageObjects.svlSearchIndexDetailPage.changeTab('settingsTab');
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('settings');
            await pageObjects.svlSearchIndexDetailPage.expectSettingsComponentIsVisible();
          });
          it('should be able to delete document', async () => {
            await pageObjects.svlSearchIndexDetailPage.changeTab('dataTab');
            await pageObjects.svlSearchIndexDetailPage.clickFirstDocumentDeleteAction();
            await pageObjects.svlSearchIndexDetailPage.expectAddDocumentCodeExamples();
            await pageObjects.svlSearchIndexDetailPage.expectQuickStatsToHaveDocumentCount(0);
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
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          });

          beforeEach(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          });

          it('delete document button is enabled', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectDeleteDocumentActionToBeEnabled();
          });
          it('add field button is enabled', async () => {
            await pageObjects.svlSearchIndexDetailPage.changeTab('mappingsTab');
            await pageObjects.svlSearchIndexDetailPage.expectAddFieldToBeEnabled();
          });
          it('edit settings button is enabled', async () => {
            await pageObjects.svlSearchIndexDetailPage.changeTab('settingsTab');
            await pageObjects.svlSearchIndexDetailPage.expectEditSettingsToBeEnabled();
          });
          it('delete index button is enabled', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsActionButtonExists();
            await pageObjects.svlSearchIndexDetailPage.clickMoreOptionsActionsButton();
            await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsOverviewMenuIsShown();
            await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonExistsInMoreOptions();
            await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonToBeEnabled();
          });
        });

        describe('page loading error', () => {
          before(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
            await esDeleteAllIndices(indexName);
          });
          it('has page load error section', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectPageLoadErrorExists();
            await pageObjects.svlSearchIndexDetailPage.expectIndexNotFoundErrorExists();
          });
          it('reload button shows details page again', async () => {
            await es.indices.create({ index: indexName });
            await pageObjects.svlSearchIndexDetailPage.clickPageReload();
            await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          });
          it('shows action menu in actions popover', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsActionButtonExists();
            await pageObjects.svlSearchIndexDetailPage.clickMoreOptionsActionsButton();
            await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsOverviewMenuIsShown();
          });
          it('should delete index', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonExistsInMoreOptions();
            await pageObjects.svlSearchIndexDetailPage.clickDeleteIndexButton();
            await pageObjects.svlSearchIndexDetailPage.clickConfirmingDeleteIndex();
          });
        });
      });
      describe('index management index list page', () => {
        before(async () => {
          await es.indices.create({ index: indexName });
          await security.testUser.setRoles(['index_management_user']);
        });
        beforeEach(async () => {
          await pageObjects.common.navigateToApp('indexManagement');
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
            await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('data');
          });

          it('navigates to settings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
            await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('settings');
          });
          it('navigates to mappings tab', async () => {
            await pageObjects.indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
            await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
            await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('mappings');
          });
        });
        describe('can view search index details', function () {
          it('renders search index details with no documents', async () => {
            await pageObjects.svlSearchIndexDetailPage.openIndicesDetailFromIndexManagementIndicesListTable(
              0
            );
            await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
            await pageObjects.svlSearchIndexDetailPage.expectSearchIndexDetailsTabsExists();
            await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkExists();
          });
        });
      });
    });

    describe('viewer', function () {
      before(async () => {
        await esDeleteAllIndices(indexName);
        await es.index({
          index: indexName,
          body: {
            my_field: [1, 0, 1],
          },
        });
      });
      after(async () => {
        await esDeleteAllIndices(indexName);
      });
      describe('search index details page', function () {
        before(async () => {
          await pageObjects.svlCommonPage.loginAsViewer();
        });
        beforeEach(async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
        });
        it('delete document button is disabled', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectDeleteDocumentActionIsDisabled();
        });
        it('add field button is disabled', async () => {
          await pageObjects.svlSearchIndexDetailPage.changeTab('mappingsTab');
          await pageObjects.svlSearchIndexDetailPage.expectAddFieldToBeDisabled();
        });
        it('edit settings button is disabled', async () => {
          await pageObjects.svlSearchIndexDetailPage.changeTab('settingsTab');
          await pageObjects.svlSearchIndexDetailPage.expectEditSettingsIsDisabled();
        });
        it('delete index button is disabled', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsActionButtonExists();
          await pageObjects.svlSearchIndexDetailPage.clickMoreOptionsActionsButton();
          await pageObjects.svlSearchIndexDetailPage.expectMoreOptionsOverviewMenuIsShown();
          await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonExistsInMoreOptions();
          await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonToBeDisabled();
        });
        it('show no privileges to create api key', async () => {
          await pageObjects.svlApiKeys.expectAPIKeyNoPrivileges();
        });
      });
    });
  });
}
