/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const testIndexName = `index-ftr-test-${Math.random()}`;
  const es = getService('es');
  const retry = getService('retry');

  describe('Indices', function () {
    this.tags(['skipSvlSearch']);
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('indexManagement');
      // Navigate to the indices tab
      await pageObjects.indexManagement.changeTabs('indicesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('renders the indices tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);
    });
    it('can create an index', async () => {
      await pageObjects.indexManagement.clickCreateIndexButton();
      await pageObjects.indexManagement.setCreateIndexName(testIndexName);
      await pageObjects.indexManagement.clickCreateIndexSaveButton();
      await pageObjects.indexManagement.expectIndexToExist(testIndexName);
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
      describe('navigate to index detail tabs', function () {
        before(async () => {
          await es.indices.create({ index: testIndexName });
        });
        after(async () => {
          await esDeleteAllIndices(testIndexName);
        });
        it('navigates to overview', async () => {
          await pageObjects.indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
          await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
          await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('overview');
        });

        it('navigates to settings tab', async () => {
          await pageObjects.indexManagement.changeManageIndexTab('showSettingsIndexMenuButton');
          await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
          await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('settings');
        });
        it('navigates to mappings tab', async () => {
          await pageObjects.indexManagement.changeManageIndexTab('showMappingsIndexMenuButton');
          await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
          await pageObjects.indexManagement.indexDetailsPage.expectUrlShouldChangeTo('mappings');
        });
      });
      it('can delete index', async () => {
        await pageObjects.indexManagement.confirmDeleteModalIsVisible();
        await retry.try(async () => {
          await pageObjects.indexManagement.expectIndexIsDeleted(testIndexName);
        });
      });
    });
  });
};
