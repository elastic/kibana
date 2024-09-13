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
  const es = getService('es');
  const retry = getService('retry');

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';

  describe('search index detail page', () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await es.indices.create({ index: indexName });
      await retry.tryForTime(60 * 1000, async () => {
        await pageObjects.svlSearchIndexDetailPage.navigateToIndexDetailPage(indexName);
      });
    });

    after(async () => {
      await esDeleteAllIndices(indexName);
    });
    it('loads index detail page', async () => {
      await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPageHeader();
      await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPage();
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
      await pageObjects.svlSearchIndexDetailPage.navigateToIndexDetailPage(indexName);
      await pageObjects.svlSearchIndexDetailPage.expectQuickStatsAIMappingsToHaveVectorFields();
    });

    it('should show code examples for adding documents', async () => {
      await pageObjects.svlSearchIndexDetailPage.expectAddDocumentCodeExamples();
    });

    it('should have index documents', async () => {
      await es.index({
        index: indexName,
        body: {
          my_field: [1, 0, 1],
        },
      });

      await pageObjects.svlSearchIndexDetailPage.navigateToIndexDetailPage(indexName);
      await pageObjects.svlSearchIndexDetailPage.expectHasIndexDocuments();
    });

    it('should redirect to indices list page', async () => {
      await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonExists();
      await pageObjects.svlSearchIndexDetailPage.clickBackToIndicesButton();
      await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonRedirectsToListPage();
    });
  });
}
