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
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const es = getService('es');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';

  describe('Search index detail page', () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
    });
    after(async () => {
      await esDeleteAllIndices(indexName);
    });

    describe('index details page overview', () => {
      before(async () => {
        await es.indices.create({ index: indexName });
        await svlSearchNavigation.navigateToIndexDetailPage(indexName);
      });
      after(async () => {
        await esDeleteAllIndices(indexName);
      });
      it('can load index detail page', async () => {
        await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
        await pageObjects.svlSearchIndexDetailPage.expectAPIReferenceDocLinkExists();
      });
      it('should have embedded dev console', async () => {
        await testHasEmbeddedConsole(pageObjects);
      });
      it('should have connection details', async () => {
        await pageObjects.svlSearchIndexDetailPage.expectConnectionDetails();
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

      it('should show code examples for adding documents', async () => {
        await pageObjects.svlSearchIndexDetailPage.expectAddDocumentCodeExamples();
      });

      it('back to indices button should redirect to list page', async () => {
        await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonExists();
        await pageObjects.svlSearchIndexDetailPage.clickBackToIndicesButton();
        await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonRedirectsToListPage();
      });
      describe('With data', () => {
        before(async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          await es.index({
            index: indexName,
            body: {
              my_field: [1, 0, 1],
            },
          });
        });
        it('should have index documents', async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          await pageObjects.svlSearchIndexDetailPage.expectHasIndexDocuments();
        });
        it('should have with data tabs', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectWithDataTabsExists();
          await pageObjects.svlSearchIndexDetailPage.expectShouldDefaultToDataTab();
        });
        it('should be able to change tabs to mappings and mappings is shown', async () => {
          await pageObjects.svlSearchIndexDetailPage.withDataChangeTabs('mappingsTab');
          await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('mappings');
          await pageObjects.svlSearchIndexDetailPage.expectMappingsComponentIsVisible();
        });
        it('should be able to change tabs to settings and settings is shown', async () => {
          await pageObjects.svlSearchIndexDetailPage.withDataChangeTabs('settingsTab');
          await pageObjects.svlSearchIndexDetailPage.expectUrlShouldChangeTo('settings');
          await pageObjects.svlSearchIndexDetailPage.expectSettingsComponentIsVisible();
        });
      });

      describe('page loading error', () => {
        before(async () => {
          await svlSearchNavigation.navigateToIndexDetailPage(indexName);
          await esDeleteAllIndices(indexName);
        });
        it('has page load error section', async () => {
          await pageObjects.svlSearchIndexDetailPage.expectPageLoadErrorExists();
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
          await pageObjects.svlSearchIndexDetailPage.expectDeleteIndexButtonExists();
          await pageObjects.svlSearchIndexDetailPage.clickDeleteIndexButton();
          await pageObjects.svlSearchIndexDetailPage.clickConfirmingDeleteIndex();
        });
      });
    });
  });
}
