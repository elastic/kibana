/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'common',
    'header',
    'indexManagement',
    'svlSearchCreateIndexPage',
  ]);
  const browser = getService('browser');
  const security = getService('security');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const testIndexName = `test-index-ftr-${Math.random()}`;
  const testAPIIndexName = `test-api-index-ftr-${Math.random()}`;
  describe('index management', function () {
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      // Navigate to the index management page
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the indices tab
      await pageObjects.indexManagement.changeTabs('indicesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });
    after(async () => {
      await esDeleteAllIndices([testIndexName, testAPIIndexName]);
    });

    it('renders the indices tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);
    });

    it('has embedded dev console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });

    describe('create index', function () {
      beforeEach(async () => {
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the indices tab
        await pageObjects.indexManagement.changeTabs('indicesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });
      it('can create an index', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();
        await pageObjects.svlSearchCreateIndexPage.expectToBeOnCreateIndexPage();
        await pageObjects.svlSearchCreateIndexPage.expectCreateIndexUIView();
        await pageObjects.svlSearchCreateIndexPage.expectCreateIndexButtonToBeEnabled();
        await pageObjects.svlSearchCreateIndexPage.setIndexNameValue(testIndexName);
        await pageObjects.svlSearchCreateIndexPage.clickCreateIndexButton();
        await pageObjects.svlSearchCreateIndexPage.expectToBeOnIndexDetailsPage();
        await pageObjects.common.navigateToApp('indexManagement');
        await pageObjects.indexManagement.changeTabs('indicesTab');
        await pageObjects.indexManagement.expectIndexToExist(testIndexName);
      });
      it('should redirect to index details when index is created via API and on the code view', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();

        await pageObjects.svlSearchCreateIndexPage.expectToBeOnCreateIndexPage();
        await pageObjects.svlSearchCreateIndexPage.expectCreateIndexUIView();
        await pageObjects.svlSearchCreateIndexPage.clickCodeViewButton();
        await pageObjects.svlSearchCreateIndexPage.expectCreateIndexCodeView();
        await es.indices.create({ index: testAPIIndexName });
        await pageObjects.svlSearchCreateIndexPage.expectToBeOnIndexDetailsPage();
      });
      it('should have file upload link', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();

        await pageObjects.svlSearchCreateIndexPage.expectToBeOnCreateIndexPage();
        await pageObjects.svlSearchCreateIndexPage.clickFileUploadLink();
        await pageObjects.svlSearchCreateIndexPage.expectToBeOnMLFileUploadPage();
      });
      it('should support closing create index page', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();

        await pageObjects.svlSearchCreateIndexPage.expectCloseCreateIndexButtonExists();
        await pageObjects.svlSearchCreateIndexPage.clickCloseCreateIndexButton();
        await pageObjects.svlSearchCreateIndexPage.expectToBeOnIndexListPage();
      });
      it('should have the embedded console', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();

        await testHasEmbeddedConsole(pageObjects);
      });
    });

    describe('manage index', function () {
      beforeEach(async () => {
        await pageObjects.common.navigateToApp('indexManagement');
        // Navigate to the indices tab
        await pageObjects.indexManagement.changeTabs('indicesTab');
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.indexManagement.manageIndex(testIndexName);
        await pageObjects.indexManagement.manageIndexContextMenuExists();
      });
      it('can delete index', async () => {
        await pageObjects.indexManagement.confirmDeleteModalIsVisible();
        await pageObjects.indexManagement.expectIndexIsDeleted(testIndexName);
      });
    });
  });
}
