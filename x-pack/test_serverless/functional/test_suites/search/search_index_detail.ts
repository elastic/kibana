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
  const PageObjects = getPageObjects(['common']);

  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const indexName = 'test-my-index';

  describe('search index detail page', () => {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await es.indices.create({ index: indexName });
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp(`elasticsearch/indices/index_details/${indexName}`, {
          shouldLoginIfPrompted: false,
        });
        await pageObjects.svlSearchIndexDetailPage.expectIndexDetailPage();
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
    it('should redirect to indices list page', async () => {
      await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonExists();
      await pageObjects.svlSearchIndexDetailPage.clickBackToIndicesButton();
      await pageObjects.svlSearchIndexDetailPage.expectBackToIndicesButtonRedirectsToListPage();
    });
  });
}
