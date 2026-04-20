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
  const searchSpace = getService('searchSpace');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

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
        });
        it('should have embedded dev console', async () => {
          await testHasEmbeddedConsole(pageObjects);
        });
        it('should have breadcrumbs', async () => {
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

        it('should have connection details button', async () => {
          await pageObjects.searchIndexDetailsPage.expectConnectionDetails();
        });
        it('should open connection details flyout', async () => {
          await pageObjects.searchIndexDetailsPage.expectConnectionDetailsFlyoutToOpen();
          await pageObjects.searchIndexDetailsPage.closeConnectionDetailsFlyout();
        });

        it('should have storage quick stats', async () => {
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStorage();
        });
        it('should have status quick stats with open status and health', async () => {
          await pageObjects.searchIndexDetailsPage.expectQuickStatsToHaveIndexStatus();
          await pageObjects.searchIndexDetailsPage.expectStatusDetailsToShowStatus('Open');
          await pageObjects.searchIndexDetailsPage.expectStatusDetailsToShowHealthBadge();
        });
        it('should show zero documents in status details for empty index', async () => {
          await pageObjects.searchIndexDetailsPage.expectStatusDetailsToHaveDocCount(0);
        });

        it('should have add data section', async () => {
          await pageObjects.searchIndexDetailsPage.expectAddDataSectionExists();
        });
        it('should not show data preview for empty index', async () => {
          await pageObjects.searchIndexDetailsPage.expectDataPreviewNotExists();
        });

        describe('With data', () => {
          before(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDataName);
          });
          it('should show open status and health in status details', async () => {
            await pageObjects.searchIndexDetailsPage.expectStatusDetailsToShowStatus('Open');
            await pageObjects.searchIndexDetailsPage.expectStatusDetailsToShowHealthBadge();
          });
          it('should have documents in status details', async () => {
            await pageObjects.searchIndexDetailsPage.expectStatusDetailsToHaveDocCount(46);
          });
          it('should show data preview', async () => {
            await pageObjects.searchIndexDetailsPage.expectDataPreviewExists();
          });
          it('should have overview, mappings, and settings tabs', async () => {
            await pageObjects.searchIndexDetailsPage.expectTabsExists();
          });
          it('should be able to change tabs to mappings and mappings is shown', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('indexDetailsTab-mappings');
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('mappings');
            await pageObjects.searchIndexDetailsPage.expectMappingsComponentIsVisible();
          });
          it('should be able to change tabs to settings and settings is shown', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('indexDetailsTab-settings');
            await pageObjects.searchIndexDetailsPage.expectUrlShouldChangeTo('settings');
            await pageObjects.searchIndexDetailsPage.expectSettingsComponentIsVisible();
          });
        });

        describe('has index actions enabled', () => {
          beforeEach(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDataName);
          });

          it('add field button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('indexDetailsTab-mappings');
            await pageObjects.searchIndexDetailsPage.expectAddFieldToBeEnabled();
          });
          it('edit settings button is enabled', async () => {
            await pageObjects.searchIndexDetailsPage.changeTab('indexDetailsTab-settings');
            await pageObjects.searchIndexDetailsPage.expectEditSettingsToBeEnabled();
          });
          it('delete index button exists', async () => {
            await pageObjects.searchIndexDetailsPage.expectManageIndexButtonExists();
            await pageObjects.searchIndexDetailsPage.clickManageIndexButton();
            await pageObjects.searchIndexDetailsPage.expectManageIndexContextMenuIsShown();
            await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonExists();
          });
        });

        describe('page loading error', () => {
          before(async () => {
            await pageObjects.common.navigateToApp('indexManagement', {
              path: 'indices/index_details',
              search: `indexName=${indexDoesNotExistName}`,
              basePath: `s/${spaceCreated.id}`,
              shouldLoginIfPrompted: false,
            });
          });
          it('has page load error section', async () => {
            await pageObjects.searchIndexDetailsPage.expectPageLoadErrorExists();
          });
        });
        describe('Index manage menu', () => {
          before(async () => {
            await pageObjects.searchNavigation.navigateToIndexDetailPage(indexWithDataName);
          });
          it('shows action menu in manage index popover', async () => {
            await pageObjects.searchIndexDetailsPage.expectManageIndexButtonExists();
            await pageObjects.searchIndexDetailsPage.clickManageIndexButton();
            await pageObjects.searchIndexDetailsPage.expectManageIndexContextMenuIsShown();
          });
          it('should delete index', async () => {
            await pageObjects.searchIndexDetailsPage.expectDeleteIndexButtonExists();
            await pageObjects.searchIndexDetailsPage.clickDeleteIndexButton();
            await pageObjects.searchIndexDetailsPage.clickConfirmingDeleteIndex();
          });
        });
      });
    });
  });
}
