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
    'svlSearchElasticsearchStartPage',
  ]);
  const svlSearchNavigation = getService('svlSearchNavigation');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const es = getService('es');

  const deleteAllTestIndices = async () => {
    await esDeleteAllIndices(['search-*', 'test-*']);
  };

  describe('Elasticsearch Start [Onboarding Empty State]', function () {
    describe('developer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginWithRole('developer');
      });
      after(async () => {
        await deleteAllTestIndices();
      });
      beforeEach(async () => {
        await deleteAllTestIndices();
        await svlSearchNavigation.navigateToElasticsearchStartPage();
      });

      it('should have embedded dev console', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await testHasEmbeddedConsole(pageObjects);
      });

      it('should support index creation flow with UI', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeEnabled();
        await pageObjects.svlSearchElasticsearchStartPage.clickCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });

      it('should support setting index name', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectIndexNameToExist();
        await pageObjects.svlSearchElasticsearchStartPage.setIndexNameValue('INVALID_INDEX');
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeDisabled();
        await pageObjects.svlSearchElasticsearchStartPage.setIndexNameValue('test-index-name');
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeEnabled();
        await pageObjects.svlSearchElasticsearchStartPage.clickCreateIndexButton();
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });

      it('should redirect to index details when index is created via API', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await es.indices.create({ index: 'test-my-index' });
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });
    });
    describe('viewer', function () {
      before(async () => {
        await pageObjects.svlCommonPage.loginAsViewer();
        await deleteAllTestIndices();
      });
      beforeEach(async () => {
        await svlSearchNavigation.navigateToElasticsearchStartPage();
      });
      after(async () => {
        await deleteAllTestIndices();
      });

      it('should redirect to index details when index is created via API', async () => {
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnStartPage();
        await pageObjects.svlSearchElasticsearchStartPage.expectCreateIndexButtonToBeDisabled();
        await es.indices.create({ index: 'test-my-api-index' });
        await pageObjects.svlSearchElasticsearchStartPage.expectToBeOnIndexDetailsPage();
      });
    });
  });
}
