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
    'searchIndexDetailsPage',
    'svlApiKeys',
    'header',
    'common',
    'indexManagement',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
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
      await esDeleteAllIndices([indexDoesNotExistName]);
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
          await pageObjects.searchIndexDetailsPage.expectIndexDetailPageHeader();
          await pageObjects.searchIndexDetailsPage.expectSearchIndexDetailsTabsExists();
          await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkExists();
          await pageObjects.searchIndexDetailsPage.expectAPIReferenceDocLinkMissingInMoreOptions();
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });

        it('should have breadcrumb navigation', async () => {
          await pageObjects.searchIndexDetailsPage.expectIndexNametoBeInBreadcrumbs(
            indexWithoutDataName
          );
          await pageObjects.searchIndexDetailsPage.clickOnBreadcrumb('Index Management');
          await pageObjects.indexManagement.expectToBeOnIndexManagement();
          await svlSearchNavigation.navigateToIndexDetailPage(indexWithoutDataName);
        });

        it('should have connection details', async () => {
          await pageObjects.searchIndexDetailsPage.expectConnectionDetails();
        });

        it('should have basic example texts', async () => {
          await pageObjects.searchIndexDetailsPage.expectHasSampleDocuments();
        });

        it('should have quick stats', async () => {
          await pageObjects.searchIndexDetailsPage.expectStatelessQuickStats();
          await pageObjects.searchIndexDetailsPage.expectQuickStatsAIMappings();
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
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDataName);
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
          it('should have documents in quick stats', async () => {
            await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveDocumentCount(46);
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
            await browser.refresh();
            await retry.tryWithRetries(
              'Wait for document count to update',
              async () => {
                await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveDocumentCount(45);
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
            await pageObjects.searchIndexDetailsPage.expectQuickStatsAIMappingsToHaveVectorFields();
          });
        });

        describe('has index actions enabled', () => {
          beforeEach(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
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
            // manually navigate to index detail page for an index that doesn't exist
            await pageObjects.common.navigateToApp(
              `elasticsearch/indices/index_details/${indexDoesNotExistName}`,
              {
                shouldLoginIfPrompted: false,
              }
            );
          });
          it('has page load error section', async () => {
            await pageObjects.searchIndexDetailsPage.expectPageLoadErrorExists();
            await pageObjects.searchIndexDetailsPage.expectIndexNotFoundErrorExists();
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await svlSearchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
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
          await pageObjects.searchIndexDetailsPage.expectDeleteDocumentActionIsDisabled();
        });
        it('add field button is disabled', async () => {
          await pageObjects.searchIndexDetailsPage.changeTab('mappingsTab');
          await pageObjects.searchIndexDetailsPage.expectAddFieldToBeDisabled();
        });
        it('edit settings button is disabled', async () => {
          await pageObjects.searchIndexDetailsPage.changeTab('settingsTab');
          await pageObjects.searchIndexDetailsPage.expectEditSettingsIsDisabled();
        });
        it('delete index button is disabled', async () => {
          await pageObjects.searchIndexDetailsPage.expectMoreOptionsActionButtonExists();
          await pageObjects.searchIndexDetailsPage.clickMoreOptionsActionsButton();
          await pageObjects.searchIndexDetailsPage.expectMoreOptionsOverviewMenuIsShown();
          await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonExistsInMoreOptions();
          await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonToBeDisabled();
        });
        it('show no privileges to create api key', async () => {
          await pageObjects.svlApiKeys.expectAPIKeyNoPrivileges();
        });
      });
    });
  });
}
