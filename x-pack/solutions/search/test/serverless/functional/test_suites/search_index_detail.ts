/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

const archivedBooksIndex = 'x-pack/solutions/search/test/functional_search/fixtures/search-books';
const archiveEmptyIndex =
  'x-pack/solutions/search/test/functional_search/fixtures/search-empty-index';
const archiveDenseVectorIndex =
  'x-pack/solutions/search/test/functional_search/fixtures/search-national-parks';

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
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');

  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const indexWithDataName = 'search-books';
  const indexWithoutDataName = 'search-empty-index';
  const indexWithDenseVectorName = 'search-national-parks';
  const indexDoesNotExistName = 'search-not-found';

  const createIndices = async () => {
    await esArchiver.load(archivedBooksIndex);
    await esArchiver.load(archiveDenseVectorIndex);
    await esArchiver.load(archiveEmptyIndex);
  };
  const deleteIndices = async () => {
    await esArchiver.unload(archivedBooksIndex);
    await esArchiver.unload(archiveDenseVectorIndex);
    await esArchiver.unload(archiveEmptyIndex);
    await esDeleteAllIndices([indexDoesNotExistName]);
  };

  describe('index details page - search solution', function () {
    // fails on MKI, see https://github.com/elastic/kibana/issues/233476
    this.tags(['failsOnMKI']);

    before(async () => {
      await createIndices();
    });

    after(async () => {
      await deleteIndices();
    });
    describe('developer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginWithRole('developer');
        await pageObjects.svlApiKeys.deleteAPIKeys();
      });
      describe('search index details page', () => {
        before(async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexWithoutDataName);
        });
        it('can load index detail page', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
          await pageObjects.svlSearchIndexDetailPage.expectSearchIndexDetailsTabsExists();
          await pageObjects.svlSearchIndexDetailPage.dismissIngestTourIfShown();
          await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkExists();
          await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkMissingInMoreOptions();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });

        it('should have breadcrumb navigation', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectBreadcrumbNavigationWithIndexName(
            indexWithoutDataName
          );
          await pageObjects.svlSearchIndexDetailPage.clickOnIndexManagementBreadcrumb();
          await pageObjects.indexManagement.expectToBeOnIndexManagement();
          await svlSearchNavigation.navigateToIndexDetailPage(indexWithoutDataName);
        });

        it('should have connection details', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectConnectionDetails();
        });

        it('should have basic example texts', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectHasSampleDocuments();
        });

        it('should have quick stats', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectQuickStats();
          await pageObjects.svlSearchIndexDetailPage.expectQuickStatsAIMappings();
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
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDataName);
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
          it('should have documents in quick stats', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectQuickStatsToHaveDocumentCount(46);
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

            // re-open page to refresh queries for test (these will auto-refresh,
            // but waiting for that will make this test flakey)
            await browser.refresh();
            await retry.tryWithRetries(
              'Wait for document count to update',
              async () => {
                await pageObjects.svlSearchIndexDetailPage.expectQuickStatsToHaveDocumentCount(45);
              },
              {
                retryCount: 5,
                retryDelay: 1000,
              },
              async () => {
                await browser.refresh();
              }
            );
          });
        });
        describe('With dense vectors', () => {
          it('should have ai quick stats for index with semantic mappings', async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
            await pageObjects.svlSearchIndexDetailPage.expectQuickStatsAIMappingsToHaveVectorFields();
          });
        });

        describe('has index actions enabled', () => {
          beforeEach(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
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

        describe.skip('page loading error', () => {
          before(async () => {
            // manually navigate to index detail page for an index that doesn't exist
            await pageObjects.common.navigateToApp(
              `elasticsearch/indices/index_details/${indexDoesNotExistName}`,
              {
                shouldLoginIfPrompted: false,
              }
            );
          });
          it('has page load error section', async () => {
            await pageObjects.svlSearchIndexDetailPage.expectPageLoadErrorExists();
            await pageObjects.svlSearchIndexDetailPage.expectIndexNotFoundErrorExists();
          });
          it('reload button shows details page again', async () => {
            await es.indices.create({ index: indexDoesNotExistName });
            await retry.tryForTime(
              30 * 1000,
              async () => {
                if (await pageObjects.svlSearchIndexDetailPage.pageReloadButtonIsVisible()) {
                  await pageObjects.svlSearchIndexDetailPage.clickPageReload();
                }
                await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
              },
              undefined,
              1000
            );
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
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
        beforeEach(async () => {
          await pageObjects.common.navigateToApp('indexManagement');
          // Navigate to the indices tab
          await pageObjects.indexManagement.changeTabs('indicesTab');
          await pageObjects.header.waitUntilLoadingHasFinished();
        });
        describe('manage index action', () => {
          beforeEach(async () => {
            await pageObjects.indexManagement.manageIndex(indexWithoutDataName);
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
      });
    });

    describe('viewer', function () {
      describe('search index details page', function () {
        before(async () => {
          await pageObjects.svlCommonPage.loginAsViewer();
        });
        beforeEach(async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexWithDataName);
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
