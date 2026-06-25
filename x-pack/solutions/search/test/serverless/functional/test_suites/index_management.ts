/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'embeddedConsole',
    'common',
    'header',
    'indexManagement',
  ]);
  const browser = getService('browser');
  const security = getService('security');
  const toasts = getService('toasts');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  const testIndexName = `test-index-ftr-${Math.random()}`;
  describe('index management', function () {
    // see details: https://github.com/elastic/kibana/issues/200878
    this.tags(['failsOnMKI']);
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
      await esDeleteAllIndices([testIndexName, 'search-*']);
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
      it('can create an index with the prepopulated name', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();
        await pageObjects.indexManagement.clickCreateIndexSaveButton();
        const title = await toasts.getTitleAndDismiss();
        expect(title).to.contain('Successfully created index');
      });
      it('can create an index with a custom name', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();
        await pageObjects.indexManagement.setCreateIndexName(testIndexName);
        await pageObjects.indexManagement.clickCreateIndexSaveButton();
        await pageObjects.indexManagement.expectIndexToExist(testIndexName);
      });
      it('should show API code when "Show API" button is clicked', async () => {
        await pageObjects.indexManagement.clickCreateIndexButton();

        await pageObjects.indexManagement.clickCreateIndexShowApiButton();

        const buttonText = await pageObjects.indexManagement.getCreateIndexShowApiButtonText();
        expect(buttonText).to.be('Hide API');

        const codeContent = await pageObjects.indexManagement.getCreateIndexApiCodeBlockContent();
        expect(codeContent).to.contain('PUT');
        expect(codeContent).to.contain('"mode":"standard"');
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
