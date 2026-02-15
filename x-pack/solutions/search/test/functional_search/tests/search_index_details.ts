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
    'embeddedConsole',
    'searchIndexDetailsPage',
    'header',
    'common',
    'indexManagement',
    'searchNavigation',
    'solutionNavigation',
  ]);
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const spaces = getService('spaces');
  const searchSpace = getService('searchSpace');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const retry = getService('retry');

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
  const indexWithDataName = 'search-books';
  const indexWithoutDataName = 'search-empty-index';
  const indexWithDenseVectorName = 'search-national-parks';
  const indexDoesNotExistName = 'search-not-found';

  describe('Search index details page', function () {
    describe('Solution Nav - Search', function () {
      let cleanUp: () => Promise<unknown>;
      let spaceCreated: { id: string } = { id: '' };

      before(async () => {
        ({ cleanUp, spaceCreated } = await searchSpace.createTestSpace(
          'solution-nav-search-index-details-ftr'
        ));

        await esDeleteAllIndices([indexDoesNotExistName]);
        await createIndices();
      });

      after(async () => {
        // Clean up space created
        await cleanUp();
        await deleteIndices();
      });
      describe('search index details page', () => {
        before(async () => {
          // Navigate to the spaces management page which will log us in Kibana
          await searchSpace.navigateTo(spaceCreated.id);
          await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithoutDataName);
          await pageObjects.searchIndexDetailsPage.expectIndexDetailsPageIsLoaded();
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
        it('should have breadcrumbs', async () => {
          await pageObjects.searchIndexDetailsPage.expectIndexNametoBeInBreadcrumbs(
            indexWithoutDataName
          );
          await pageObjects.searchIndexDetailsPage.expectBreadcrumbsToBeAvailable('Build');
          await pageObjects.searchIndexDetailsPage.expectBreadcrumbsToBeAvailable(
            'Index Management'
          );
          await pageObjects.searchIndexDetailsPage.expectBreadcrumbsToBeAvailable('Indices');

          await pageObjects.searchIndexDetailsPage.clickOnBreadcrumb('Indices');
          await pageObjects.indexManagement.expectToBeOnIndexManagement();

          await pageObjects.searchIndexDetailsPage.clickOnBreadcrumb('Index Management');
          await pageObjects.indexManagement.expectToBeOnIndexManagement();

          await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithoutDataName);
        });

        it('should have connection details', async () => {
          await pageObjects.searchIndexDetailsPage.expectConnectionDetails();
        });

        it('should have basic example texts', async () => {
          await pageObjects.searchIndexDetailsPage.expectHasSampleDocuments();
        });

        it('should have quick stats', async () => {
          await pageObjects.searchIndexDetailsPage.expectQuickStats();
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStatus();
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStorage('227.00 B');
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
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDataName);
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
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
            await pageObjects.searchIndexDetailsPage.expectQuickStatsAIMappingsToHaveVectorFields();
          });
        });
        // FLAKY: https://github.com/elastic/kibana/issues/248780
        describe.skip('has index actions enabled', () => {
          beforeEach(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDenseVectorName);
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
            await browser.navigateTo(
              `${spaces.getRootUrl(
                spaceCreated.id
              )}/app/elasticsearch/indices/index_details/${indexDoesNotExistName}/data`
            );
          });
          it('has page load error section', async () => {
            await pageObjects.searchIndexDetailsPage.expectPageLoadErrorExists();
            await pageObjects.searchIndexDetailsPage.expectIndexNotFoundErrorExists();
          });
        });
        describe('Index more options menu', () => {
          before(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDataName);
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
    });
  });
}
